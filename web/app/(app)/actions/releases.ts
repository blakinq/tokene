"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { extractReferences, resolveReferences } from "@/lib/core/references";
import { validateToken } from "@/lib/core/validation";
import { dispatchExternalNotifications } from "@/lib/notifications/dispatch";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TokenType } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * §9.6: keep `token_references` in sync with a token's new value. Wipes prior
 * outgoing edges, then inserts edges for every `{name}` reference that
 * resolves to a workspace token.
 */
async function refreshTokenReferences(
  supabase: SupabaseClient,
  workspaceId: string,
  sourceTokenId: string,
  newValue: string,
): Promise<void> {
  await supabase
    .from("token_references")
    .delete()
    .eq("source_token_id", sourceTokenId)
    .eq("workspace_id", workspaceId);

  const refs = extractReferences(newValue);
  if (refs.length === 0) return;

  const { data: referenced } = await supabase
    .from("tokens")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .in("name", refs);

  const rows = ((referenced ?? []) as Array<{ id: string; name: string }>).map(
    (r) => ({
      workspace_id: workspaceId,
      source_token_id: sourceTokenId,
      referenced_token_id: r.id,
    }),
  );
  if (rows.length > 0) {
    await supabase.from("token_references").insert(rows as never);
  }
}

/**
 * §10.6: after a publish, every open / approved / changes_requested CR may
 * now point at tokens whose names, values, or types have shifted. Re-run
 * validation; flag the CR `stale` with a human reason if anything is now an
 * error.
 */
async function revalidateOpenCRs(
  supabase: SupabaseClient,
  workspaceId: string,
  excludeCrIds: string[],
): Promise<void> {
  const { data: openCRsRaw } = await supabase
    .from("change_requests")
    .select("id, stale")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "approved", "changes_requested"]);

  const openCRs = (openCRsRaw ?? []).filter(
    (c) => !excludeCrIds.includes((c as { id: string }).id),
  ) as Array<{ id: string; stale: boolean }>;
  if (openCRs.length === 0) return;

  const schema = await loadSchemaConfig(supabase, workspaceId);

  const { data: tokenRows } = await supabase
    .from("tokens")
    .select("name, current_value, description")
    .eq("workspace_id", workspaceId);

  const baseline = new Map<string, string>();
  const descriptionsByName = new Map<string, string | null>();
  for (const row of (tokenRows ?? []) as Array<{
    name: string;
    current_value: string | null;
    description: string | null;
  }>) {
    baseline.set(row.name, row.current_value ?? "");
    descriptionsByName.set(row.name, row.description);
  }

  for (const cr of openCRs) {
    const { data: itemsRaw } = await supabase
      .from("change_request_items")
      .select("token_name, token_type, after_value")
      .eq("change_request_id", cr.id)
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });

    const items = (itemsRaw ?? []) as Array<{
      token_name: string;
      token_type: TokenType | null;
      after_value: string | null;
    }>;

    const tokensByName = new Map(baseline);
    for (const it of items) {
      if (it.after_value) tokensByName.set(it.token_name, it.after_value);
    }

    let staleReason: string | null = null;
    for (const it of items) {
      if (!it.after_value || !it.token_type) continue;
      const v = validateToken({
        name: it.token_name,
        type: it.token_type,
        value: it.after_value,
        description: descriptionsByName.get(it.token_name) ?? undefined,
        tokensByName,
        schema,
      });
      const err = v.issues.find((i) => i.severity === "error");
      if (err) {
        staleReason = `${it.token_name}: ${err.message}`;
        break;
      }
    }

    const isStale = staleReason !== null;
    if (isStale !== cr.stale) {
      await supabase
        .from("change_requests")
        .update({ stale: isStale, stale_reason: staleReason } as never)
        .eq("id", cr.id)
        .eq("workspace_id", workspaceId);
    }
  }
}

type PublishOpts = {
  crIds: string[];
  version: string;
  summary: string | null;
  idempotencyKey: string | null;
};

/**
 * Core publish path used by both single-CR and multi-CR entry points.
 *
 * §30.2 Locking: acquire a workspace-scoped release lock first; release it in
 * finally so a crashed publish doesn't strand the workspace.
 * §30.4 Idempotency: if a release already exists with the same idempotency_key
 * for this workspace, return that release id without doing the work again.
 */
async function publishCore(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  opts: PublishOpts,
): Promise<string> {
  if (opts.idempotencyKey) {
    const { data: existing } = await supabase
      .from("releases")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("idempotency_key", opts.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return (existing as { id: string }).id;
    }
  }

  const { data: granted, error: lockErr } = await supabase.rpc(
    "try_acquire_release_lock",
    { ws_id: workspaceId } as never,
  );
  if (lockErr) throw new Error(lockErr.message);
  if (!granted) {
    throw new Error(
      "Another release publish is in progress for this workspace. Try again in a moment.",
    );
  }

  let releaseId: string;
  try {
    // Verify every selected CR is approved + load.
    const { data: crsRaw } = await supabase
      .from("change_requests")
      .select("id, status, breaking")
      .eq("workspace_id", workspaceId)
      .in("id", opts.crIds);

    const crs = (crsRaw ?? []) as Array<{
      id: string;
      status: string;
      breaking: boolean;
    }>;
    if (crs.length !== opts.crIds.length) {
      throw new Error("One or more change requests were not found.");
    }
    if (crs.some((c) => c.status !== "approved")) {
      throw new Error("Only approved change requests can be published.");
    }
    const breaking = crs.some((c) => c.breaking);

    // Items for every selected CR, in deterministic order.
    const { data: itemsRaw } = await supabase
      .from("change_request_items")
      .select("token_id, token_name, after_value, kind, position")
      .eq("workspace_id", workspaceId)
      .in("change_request_id", opts.crIds)
      .order("position", { ascending: true });

    const items = (itemsRaw ?? []) as Array<{
      token_id: string | null;
      token_name: string;
      after_value: string | null;
      kind: string;
      position: number;
    }>;

    const { data: allTokens } = await supabase
      .from("tokens")
      .select("name, current_value")
      .eq("workspace_id", workspaceId);

    const tokensByName = new Map<string, string>();
    for (const row of (allTokens ?? []) as Array<{
      name: string;
      current_value: string | null;
    }>) {
      tokensByName.set(row.name, row.current_value ?? "");
    }

    for (const it of items) {
      if (!it.token_id) continue;

      // Lifecycle-only items (deprecate / archive / restore) don't change the
      // value; they just transition status (§7.5).
      if (it.kind === "deprecate") {
        await supabase
          .from("tokens")
          .update({
            status: "deprecated",
            deprecated: true,
            updated_by: userId,
          } as never)
          .eq("id", it.token_id)
          .eq("workspace_id", workspaceId);
        continue;
      }
      if (it.kind === "archive") {
        await supabase
          .from("tokens")
          .update({
            status: "archived",
            updated_by: userId,
          } as never)
          .eq("id", it.token_id)
          .eq("workspace_id", workspaceId);
        continue;
      }
      if (it.kind === "restore") {
        await supabase
          .from("tokens")
          .update({
            status: "published",
            deprecated: false,
            updated_by: userId,
          } as never)
          .eq("id", it.token_id)
          .eq("workspace_id", workspaceId);
        continue;
      }

      if (!it.after_value) continue;
      tokensByName.set(it.token_name, it.after_value);
      const resolved = resolveReferences(it.after_value, {
        tokens: tokensByName,
      });
      const resolvedValue = resolved.ok ? resolved.value : it.after_value;

      await supabase
        .from("tokens")
        .update({
          status: "published",
          current_value: it.after_value,
          current_resolved_value: resolvedValue,
          updated_by: userId,
        } as never)
        .eq("id", it.token_id)
        .eq("workspace_id", workspaceId);

      await refreshTokenReferences(
        supabase,
        workspaceId,
        it.token_id,
        it.after_value,
      );
    }

    const { data: release, error: relError } = await supabase
      .from("releases")
      .insert({
        workspace_id: workspaceId,
        version: opts.version,
        status: "published",
        summary: opts.summary,
        breaking,
        idempotency_key: opts.idempotencyKey,
        published_at: new Date().toISOString(),
        published_by: userId,
      } as never)
      .select("id")
      .single();

    if (relError || !release) {
      throw new Error(relError?.message ?? "Failed to create release.");
    }
    releaseId = (release as { id: string }).id;

    const { data: published } = await supabase
      .from("tokens")
      .select(
        "id, name, type, level, current_value, current_resolved_value, description, tags, deprecated",
      )
      .eq("workspace_id", workspaceId)
      .eq("status", "published");

    const snapshotRows = ((published ?? []) as Array<{
      id: string;
      name: string;
      type: string;
      level: string;
      current_value: string | null;
      current_resolved_value: string | null;
      description: string | null;
      tags: string[];
      deprecated: boolean;
    }>).map((t) => ({
      release_id: releaseId,
      workspace_id: workspaceId,
      token_id: t.id,
      name: t.name,
      type: t.type,
      level: t.level,
      value: t.current_value ?? "",
      resolved_value: t.current_resolved_value ?? "",
      description: t.description,
      tags: t.tags,
      deprecated: t.deprecated,
    }));

    if (snapshotRows.length > 0) {
      await supabase
        .from("release_token_snapshots")
        .insert(snapshotRows as never);
    }

    const linkRows = opts.crIds.map((id) => ({
      release_id: releaseId,
      change_request_id: id,
      workspace_id: workspaceId,
    }));
    await supabase
      .from("release_change_requests")
      .insert(linkRows as never);

    await supabase
      .from("change_requests")
      .update({ status: "published", stale: false, stale_reason: null } as never)
      .in("id", opts.crIds)
      .eq("workspace_id", workspaceId);

    await supabase.rpc("record_audit", {
      ws_id: workspaceId,
      p_action: "release.published",
      p_entity_type: "Release",
      p_entity_id: releaseId,
      p_after: {
        version: opts.version,
        change_request_ids: opts.crIds,
        breaking,
      },
    } as never);

    // §15: notify everyone in the workspace that a new release shipped.
    await supabase.rpc("notify_workspace", {
      ws_id: workspaceId,
      p_kind: "release.published",
      p_entity_type: "Release",
      p_entity_id: releaseId,
      p_title: `Release v${opts.version} published`,
      p_body: opts.summary ?? null,
      p_link: `/releases/${releaseId}`,
      p_exclude_actor: false,
      p_role_at_least: "viewer",
    } as never);
    await dispatchExternalNotifications(workspaceId, {
      kind: "release.published",
      title: `Release v${opts.version} published`,
      body: opts.summary ?? null,
      link: `/releases/${releaseId}`,
      entityType: "Release",
      entityId: releaseId,
    });

    // §10.6: every still-open CR may now reference stale state.
    await revalidateOpenCRs(supabase, workspaceId, opts.crIds);
  } finally {
    await supabase.rpc("release_publish_lock", {
      ws_id: workspaceId,
    } as never);
  }

  return releaseId;
}

/**
 * Publish a release from a single approved change request.
 */
export async function publishReleaseFromCR(formData: FormData): Promise<void> {
  const crId = String(formData.get("changeRequestId"));
  const version = String(formData.get("version") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const idempotencyKey =
    String(formData.get("idempotencyKey") ?? "").trim() || null;

  if (!version) throw new Error("Version is required.");

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const releaseId = await publishCore(supabase, workspace.workspaceId, user.id, {
    crIds: [crId],
    version,
    summary,
    idempotencyKey,
  });

  revalidatePath("/releases");
  revalidatePath(`/change-requests/${crId}`);
  redirect(`/releases/${releaseId}`);
}

/**
 * Publish a release bundling multiple approved change requests.
 */
export async function publishReleaseFromCRs(formData: FormData): Promise<void> {
  const version = String(formData.get("version") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const idempotencyKey =
    String(formData.get("idempotencyKey") ?? "").trim() || null;
  const crIds = formData
    .getAll("changeRequestIds")
    .map((x) => String(x))
    .filter(Boolean);

  if (!version) throw new Error("Version is required.");
  if (crIds.length === 0)
    throw new Error("Select at least one approved change request.");

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const releaseId = await publishCore(supabase, workspace.workspaceId, user.id, {
    crIds,
    version,
    summary,
    idempotencyKey,
  });

  revalidatePath("/releases");
  revalidatePath("/change-requests");
  redirect(`/releases/${releaseId}`);
}
