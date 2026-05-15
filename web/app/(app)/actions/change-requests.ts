"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateToken } from "@/lib/core/validation";
import { dispatchExternalNotifications } from "@/lib/notifications/dispatch";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import {
  loadSchemaConfig,
  type WorkspaceSchemaConfig,
} from "@/lib/supabase/schema-config";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TokenStatus } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * §7.5: move tokens through the lifecycle alongside their change request.
 * Only `kind = "add"` items (a draft token born inside this CR) follow the
 * draft → in_review → approved path. Edits to already-published tokens leave
 * the live token alone until the release publishes, since they remain
 * visible in exports until then.
 */
async function applyTokenStatusForCR(
  supabase: SupabaseClient,
  workspaceId: string,
  crId: string,
  next: TokenStatus,
  prevAllowed: TokenStatus[],
): Promise<void> {
  const { data: itemsRaw } = await supabase
    .from("change_request_items")
    .select("token_id, kind")
    .eq("change_request_id", crId)
    .eq("workspace_id", workspaceId);

  const ids = ((itemsRaw ?? []) as Array<{
    token_id: string | null;
    kind: string;
  }>)
    .filter((i) => i.kind === "add" && i.token_id)
    .map((i) => i.token_id as string);

  if (ids.length === 0) return;

  await supabase
    .from("tokens")
    .update({ status: next } as never)
    .in("id", ids)
    .in("status", prevAllowed)
    .eq("workspace_id", workspaceId);
}

/**
 * §8.5 / §11.3: a CR is breaking if any of its items would change observable
 * behaviour for downstream consumers — value edits to a published token,
 * deprecations, archives, and renames all qualify.
 */
function computeBreakingForItems(
  items: Array<{
    kind: string;
    before_value: string | null;
    after_value: string | null;
  }>,
): boolean {
  return items.some((it) => {
    if (it.kind === "deprecate" || it.kind === "archive" || it.kind === "rename")
      return true;
    if (it.kind === "edit") {
      return (it.before_value ?? "") !== (it.after_value ?? "");
    }
    return false;
  });
}

async function dispatchSubmittedNotification(
  supabase: SupabaseClient,
  workspaceId: string,
  crId: string,
  shortId: string,
  title: string,
): Promise<void> {
  await supabase.rpc("notify_workspace", {
    ws_id: workspaceId,
    p_kind: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_title: `${shortId} ready for review`,
    p_body: title,
    p_link: `/change-requests/${crId}`,
    p_exclude_actor: true,
    p_role_at_least: "reviewer",
  } as never);
  await dispatchExternalNotifications(workspaceId, {
    kind: "change_request.submitted",
    title: `${shortId} ready for review`,
    body: title,
    link: `/change-requests/${crId}`,
    entityType: "ChangeRequest",
    entityId: crId,
  });
}

export type CreateCRState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

export async function createChangeRequestForToken(
  tokenId: string,
  title: string,
  description: string,
): Promise<CreateCRState> {
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  // Compute next short_id (CR-001, CR-002, ...) per workspace.
  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: token } = await supabase
    .from("tokens")
    .select("id, name, type, level, current_value, status")
    .eq("id", tokenId)
    .eq("workspace_id", workspace.workspaceId)
    .single();

  if (!token) {
    return { ok: false, error: "Token not found." };
  }

  const tok = token as {
    id: string;
    name: string;
    type: string;
    level: string;
    current_value: string | null;
    status: string;
  };

  const itemKind = tok.status === "draft" ? "add" : "edit";
  const breaking = computeBreakingForItems([
    {
      kind: itemKind,
      before_value: tok.status === "draft" ? null : tok.current_value,
      after_value: tok.current_value,
    },
  ]);

  const { data: cr, error: crError } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: title || `Promote ${tok.name}`,
      description: description || null,
      status: "open",
      breaking,
      author_id: user.id,
    } as never)
    .select("id, short_id, title")
    .single();

  if (crError || !cr) {
    return { ok: false, error: crError?.message ?? "Failed to create CR." };
  }

  const crRow = cr as { id: string; short_id: string; title: string };

  await supabase.from("change_request_items").insert({
    change_request_id: crRow.id,
    workspace_id: workspace.workspaceId,
    kind: itemKind,
    token_id: tok.id,
    token_name: tok.name,
    token_type: tok.type,
    token_level: tok.level,
    before_value: tok.status === "draft" ? null : tok.current_value,
    after_value: tok.current_value,
    position: 0,
  } as never);

  await applyTokenStatusForCR(
    supabase,
    workspace.workspaceId,
    crRow.id,
    "in_review",
    ["draft"],
  );

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crRow.id,
  } as never);

  await dispatchSubmittedNotification(
    supabase,
    workspace.workspaceId,
    crRow.id,
    crRow.short_id,
    crRow.title,
  );

  revalidatePath("/change-requests");
  return { ok: true, id: crRow.id };
}

export type NewCRState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

export async function createBlankChangeRequest(
  _prev: NewCRState,
  formData: FormData,
): Promise<NewCRState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const migrationNotes = String(formData.get("migrationNotes") ?? "").trim();
  const tokenIds = formData.getAll("tokenIds").map((x) => String(x));

  if (!title) return { ok: false, error: "Title is required." };

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;

  // Fetch token rows up front so we can compute breaking before insert.
  let tokenRows: Array<{
    id: string;
    name: string;
    type: string;
    level: string;
    current_value: string | null;
    status: string;
  }> = [];
  if (tokenIds.length > 0) {
    const { data: toks } = await supabase
      .from("tokens")
      .select("id, name, type, level, current_value, status")
      .eq("workspace_id", workspace.workspaceId)
      .in("id", tokenIds);
    tokenRows = (toks ?? []) as typeof tokenRows;
  }

  const breaking = computeBreakingForItems(
    tokenRows.map((t) => ({
      kind: t.status === "draft" ? "add" : "edit",
      before_value: t.status === "draft" ? null : t.current_value,
      after_value: t.current_value,
    })),
  );

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title,
      description: description || null,
      migration_notes: migrationNotes || null,
      status: "open",
      breaking,
      author_id: user.id,
    } as never)
    .select("id, short_id, title")
    .single();

  if (crErr || !cr) {
    return { ok: false, error: crErr?.message ?? "Failed to create CR." };
  }
  const crRow = cr as { id: string; short_id: string; title: string };

  if (tokenRows.length > 0) {
    const rows = tokenRows.map((t, i) => ({
      change_request_id: crRow.id,
      workspace_id: workspace.workspaceId,
      kind: t.status === "draft" ? "add" : "edit",
      token_id: t.id,
      token_name: t.name,
      token_type: t.type,
      token_level: t.level,
      before_value: t.status === "draft" ? null : t.current_value,
      after_value: t.current_value,
      position: i,
    }));

    if (rows.length > 0) {
      await supabase.from("change_request_items").insert(rows as never);
    }
  }

  await applyTokenStatusForCR(
    supabase,
    workspace.workspaceId,
    crRow.id,
    "in_review",
    ["draft"],
  );

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crRow.id,
  } as never);

  await dispatchSubmittedNotification(
    supabase,
    workspace.workspaceId,
    crRow.id,
    crRow.short_id,
    crRow.title,
  );

  revalidatePath("/change-requests");
  redirect(`/change-requests/${crRow.id}`);
}

/**
 * Server-side enforcement of approval rules (§11.3). Returns null on success,
 * otherwise a human-readable reason that should be thrown to the user.
 */
function enforceApprovalRules(
  schema: WorkspaceSchemaConfig,
  cr: {
    author_id: string | null;
    breaking: boolean;
    migration_notes: string | null;
  },
  reviewer: { id: string; role: string },
  reviewsSoFar: Array<{ reviewer_id: string | null; reviewer_role: string }>,
): { error: string } | { ok: true; finalize: boolean } {
  if (!schema.allowSelfApproval && cr.author_id === reviewer.id) {
    return { error: "You can't approve your own change request." };
  }

  if (cr.breaking && schema.requireMigrationNotesForBreaking) {
    if (!cr.migration_notes || !cr.migration_notes.trim()) {
      return {
        error:
          "This change is breaking — the workspace requires migration notes before it can be approved.",
      };
    }
  }

  // Distinct approving reviewers including this one.
  const approverIds = new Set(
    reviewsSoFar
      .map((r) => r.reviewer_id)
      .filter((id): id is string => Boolean(id)),
  );
  approverIds.add(reviewer.id);

  if (cr.breaking && schema.requireAdminForBreaking) {
    const hasAdmin =
      reviewer.role === "admin" ||
      reviewsSoFar.some((r) => r.reviewer_role === "admin");
    if (!hasAdmin) {
      return {
        error:
          "This change is breaking — at least one admin approval is required.",
      };
    }
  }

  const finalize = approverIds.size >= schema.minApprovalCount;
  return { ok: true, finalize };
}

export async function approveChangeRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const schema = await loadSchemaConfig(supabase, workspace.workspaceId);

  // §11.4: re-run validation before recording an approval. If any item produces
  // an error against current workspace state (plus the CR's own pending edits),
  // block the approval rather than letting a broken CR move forward.
  const { data: itemsRaw } = await supabase
    .from("change_request_items")
    .select("token_name, token_type, after_value, kind")
    .eq("change_request_id", id)
    .eq("workspace_id", workspace.workspaceId)
    .order("position", { ascending: true });

  const items = (itemsRaw ?? []) as Array<{
    token_name: string;
    token_type: string | null;
    after_value: string | null;
    kind: string;
  }>;

  const { data: tokenRows } = await supabase
    .from("tokens")
    .select("name, current_value, description")
    .eq("workspace_id", workspace.workspaceId);

  const tokensByName = new Map<string, string>();
  const descriptionsByName = new Map<string, string | null>();
  for (const row of (tokenRows ?? []) as Array<{
    name: string;
    current_value: string | null;
    description: string | null;
  }>) {
    tokensByName.set(row.name, row.current_value ?? "");
    descriptionsByName.set(row.name, row.description);
  }
  for (const it of items) {
    if (it.after_value) tokensByName.set(it.token_name, it.after_value);
  }

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
    const firstErr = v.issues.find((i) => i.severity === "error");
    if (firstErr) {
      throw new Error(
        `Validation failed on ${it.token_name}: ${firstErr.message}`,
      );
    }
  }

  // Load CR + existing reviews + reviewer roles to enforce approval rules.
  const { data: crRow } = await supabase
    .from("change_requests")
    .select("id, short_id, title, author_id, breaking, migration_notes")
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .single();
  if (!crRow) throw new Error("Change request not found.");
  const cr = crRow as {
    id: string;
    short_id: string;
    title: string;
    author_id: string | null;
    breaking: boolean;
    migration_notes: string | null;
  };

  const { data: priorReviewsRaw } = await supabase
    .from("reviews")
    .select("reviewer_id")
    .eq("change_request_id", id)
    .eq("workspace_id", workspace.workspaceId)
    .eq("decision", "approve");
  const priorReviewerIds = ((priorReviewsRaw ?? []) as Array<{
    reviewer_id: string | null;
  }>)
    .map((r) => r.reviewer_id)
    .filter((x): x is string => Boolean(x));

  // Get reviewer roles in one shot.
  const allReviewerIds = Array.from(
    new Set([...priorReviewerIds, user.id]),
  );
  const { data: rolesRaw } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.workspaceId)
    .in("user_id", allReviewerIds);
  const roleByUser = new Map(
    ((rolesRaw ?? []) as Array<{ user_id: string; role: string }>).map((r) => [
      r.user_id,
      r.role,
    ]),
  );

  const decision = enforceApprovalRules(
    schema,
    cr,
    { id: user.id, role: roleByUser.get(user.id) ?? "viewer" },
    priorReviewerIds.map((rid) => ({
      reviewer_id: rid,
      reviewer_role: roleByUser.get(rid) ?? "viewer",
    })),
  );
  if ("error" in decision) {
    throw new Error(decision.error);
  }

  await supabase.from("reviews").insert({
    change_request_id: id,
    workspace_id: workspace.workspaceId,
    reviewer_id: user.id,
    decision: "approve",
  } as never);

  if (decision.finalize) {
    await supabase
      .from("change_requests")
      .update({
        status: "approved",
        stale: false,
        stale_reason: null,
      } as never)
      .eq("id", id)
      .eq("workspace_id", workspace.workspaceId);

    await applyTokenStatusForCR(
      supabase,
      workspace.workspaceId,
      id,
      "approved",
      ["in_review", "draft"],
    );

    await supabase.rpc("record_audit", {
      ws_id: workspace.workspaceId,
      p_action: "change_request.approved",
      p_entity_type: "ChangeRequest",
      p_entity_id: id,
    } as never);

    if (cr.author_id && cr.author_id !== user.id) {
      await supabase.rpc("notify_user", {
        ws_id: workspace.workspaceId,
        p_recipient: cr.author_id,
        p_kind: "change_request.approved",
        p_entity_type: "ChangeRequest",
        p_entity_id: id,
        p_title: `${cr.short_id} approved`,
        p_body: cr.title,
        p_link: `/change-requests/${id}`,
      } as never);
    }
    await dispatchExternalNotifications(workspace.workspaceId, {
      kind: "change_request.approved",
      title: `${cr.short_id} approved`,
      body: cr.title,
      link: `/change-requests/${id}`,
      entityType: "ChangeRequest",
      entityId: id,
    });
  }

  revalidatePath(`/change-requests/${id}`);
  revalidatePath("/change-requests");
}

export async function requestChangesOnCR(formData: FormData) {
  const id = String(formData.get("id"));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  await supabase.from("reviews").insert({
    change_request_id: id,
    workspace_id: workspace.workspaceId,
    reviewer_id: user.id,
    decision: "request_changes",
    comment,
  } as never);

  await supabase
    .from("change_requests")
    .update({ status: "changes_requested" } as never)
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId);

  await applyTokenStatusForCR(
    supabase,
    workspace.workspaceId,
    id,
    "draft",
    ["in_review", "approved"],
  );

  const { data: crRow } = await supabase
    .from("change_requests")
    .select("short_id, title, author_id")
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .single();
  if (crRow) {
    const cr = crRow as {
      short_id: string;
      title: string;
      author_id: string | null;
    };
    if (cr.author_id && cr.author_id !== user.id) {
      await supabase.rpc("notify_user", {
        ws_id: workspace.workspaceId,
        p_recipient: cr.author_id,
        p_kind: "change_request.changes_requested",
        p_entity_type: "ChangeRequest",
        p_entity_id: id,
        p_title: `${cr.short_id} needs changes`,
        p_body: comment ?? cr.title,
        p_link: `/change-requests/${id}`,
      } as never);
    }
    await dispatchExternalNotifications(workspace.workspaceId, {
      kind: "change_request.changes_requested",
      title: `${cr.short_id} needs changes`,
      body: comment ?? cr.title,
      link: `/change-requests/${id}`,
      entityType: "ChangeRequest",
      entityId: id,
    });
  }

  revalidatePath(`/change-requests/${id}`);
}

/**
 * Update mutable CR metadata (migration notes today). Author or reviewer+.
 */
export async function updateChangeRequestMeta(formData: FormData) {
  const id = String(formData.get("id"));
  const migrationNotes = String(formData.get("migrationNotes") ?? "").trim();
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  await supabase
    .from("change_requests")
    .update({ migration_notes: migrationNotes || null } as never)
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId);
  revalidatePath(`/change-requests/${id}`);
}

/**
 * Add a new lifecycle item (deprecate / archive / restore) to an open CR for a
 * specific token. UI surfaces these as buttons on the token detail page; we
 * always create a brand-new single-item CR rather than mutating an existing
 * one to keep the audit trail clean.
 */
export async function createLifecycleCR(formData: FormData) {
  const tokenId = String(formData.get("tokenId"));
  const kind = String(formData.get("kind"));
  if (!["deprecate", "archive", "restore"].includes(kind)) {
    throw new Error(`Unsupported lifecycle action: ${kind}`);
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: tokenRow } = await supabase
    .from("tokens")
    .select("id, name, type, level, current_value, status")
    .eq("id", tokenId)
    .eq("workspace_id", workspace.workspaceId)
    .single();
  if (!tokenRow) throw new Error("Token not found.");
  const tok = tokenRow as {
    id: string;
    name: string;
    type: string;
    level: string;
    current_value: string | null;
    status: string;
  };

  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);
  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const verb =
    kind === "deprecate"
      ? "Deprecate"
      : kind === "archive"
        ? "Archive"
        : "Restore";
  const breaking = kind !== "restore";

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: `${verb} ${tok.name}`,
      status: "open",
      breaking,
      author_id: user.id,
    } as never)
    .select("id, short_id, title")
    .single();
  if (crErr || !cr) throw new Error(crErr?.message ?? "Failed to create CR.");
  const crRow = cr as { id: string; short_id: string; title: string };

  await supabase.from("change_request_items").insert({
    change_request_id: crRow.id,
    workspace_id: workspace.workspaceId,
    kind,
    token_id: tok.id,
    token_name: tok.name,
    token_type: tok.type,
    token_level: tok.level,
    before_value: tok.current_value,
    after_value: tok.current_value,
    position: 0,
  } as never);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crRow.id,
    p_after: { kind, token_name: tok.name },
  } as never);

  await dispatchSubmittedNotification(
    supabase,
    workspace.workspaceId,
    crRow.id,
    crRow.short_id,
    crRow.title,
  );

  revalidatePath("/change-requests");
  revalidatePath(`/tokens/${tok.id}`);
  redirect(`/change-requests/${crRow.id}`);
}

/**
 * §3.4: propose a value edit to a published token via a new CR. Unlike
 * `createChangeRequestForToken` (which assumes after == before and is really a
 * "promote" path), this records a real `kind = "edit"` item where after_value
 * differs from the live token's value. The token itself stays published — its
 * value won't change until the CR is approved and a release is published.
 */
export type EditTokenCRState =
  | { ok: true; crId: string }
  | {
      ok: false;
      error: string;
      issues?: { code: string; message: string; path?: string }[];
    }
  | null;

export async function createEditCRForToken(
  _prev: EditTokenCRState,
  formData: FormData,
): Promise<EditTokenCRState> {
  const tokenId = String(formData.get("tokenId") ?? "");
  const newValue = String(formData.get("value") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const migrationNotes = String(formData.get("migrationNotes") ?? "").trim();

  if (!tokenId) return { ok: false, error: "Token id is required." };
  if (!newValue) return { ok: false, error: "Provide a new value." };

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: tokenRow } = await supabase
    .from("tokens")
    .select("id, name, type, level, current_value, status, description")
    .eq("id", tokenId)
    .eq("workspace_id", workspace.workspaceId)
    .single();
  if (!tokenRow) return { ok: false, error: "Token not found." };

  const tok = tokenRow as {
    id: string;
    name: string;
    type: string;
    level: string;
    current_value: string | null;
    status: string;
    description: string | null;
  };

  if (tok.status !== "published" && tok.status !== "deprecated") {
    return {
      ok: false,
      error:
        "Only published or deprecated tokens can be edited through this flow. Draft tokens can be attached directly to a change request.",
    };
  }

  if ((tok.current_value ?? "") === newValue) {
    return {
      ok: false,
      error: "New value matches the current value.",
      issues: [
        {
          code: "value.unchanged",
          message: "Pick a value different from the current published value.",
          path: "value",
        },
      ],
    };
  }

  // Build the tokensByName map and overlay the proposed edit so reference
  // resolution sees the new value when validating downstream tokens that
  // reference this one (matches the same overlay logic used at approval time).
  const { data: tokenRows } = await supabase
    .from("tokens")
    .select("name, current_value")
    .eq("workspace_id", workspace.workspaceId);

  const tokensByName = new Map<string, string>();
  for (const row of (tokenRows ?? []) as Array<{
    name: string;
    current_value: string | null;
  }>) {
    tokensByName.set(row.name, row.current_value ?? "");
  }
  tokensByName.set(tok.name, newValue);

  const schema = await loadSchemaConfig(supabase, workspace.workspaceId);
  const validation = validateToken({
    name: tok.name,
    type: tok.type,
    value: newValue,
    description: tok.description ?? undefined,
    tokensByName,
    schema,
  });
  if (!validation.valid) {
    return {
      ok: false,
      error: "Validation failed.",
      issues: validation.issues
        .filter((i) => i.severity === "error")
        .map(({ code, message, path }) => ({ code, message, path })),
    };
  }

  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);
  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const breaking = computeBreakingForItems([
    {
      kind: "edit",
      before_value: tok.current_value,
      after_value: newValue,
    },
  ]);

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: title || `Edit ${tok.name}`,
      description: description || null,
      migration_notes: migrationNotes || null,
      status: "open",
      breaking,
      author_id: user.id,
    } as never)
    .select("id, short_id, title")
    .single();
  if (crErr || !cr) {
    return { ok: false, error: crErr?.message ?? "Failed to create CR." };
  }
  const crRow = cr as { id: string; short_id: string; title: string };

  await supabase.from("change_request_items").insert({
    change_request_id: crRow.id,
    workspace_id: workspace.workspaceId,
    kind: "edit",
    token_id: tok.id,
    token_name: tok.name,
    token_type: tok.type,
    token_level: tok.level,
    before_value: tok.current_value,
    after_value: newValue,
    position: 0,
  } as never);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crRow.id,
    p_after: {
      kind: "edit",
      token_name: tok.name,
      before: tok.current_value,
      after: newValue,
    },
  } as never);

  await dispatchSubmittedNotification(
    supabase,
    workspace.workspaceId,
    crRow.id,
    crRow.short_id,
    crRow.title,
  );

  revalidatePath("/change-requests");
  revalidatePath(`/tokens/${tok.id}`);
  return { ok: true, crId: crRow.id };
}

/**
 * Amend the `after_value` of a single CR item while the CR is still open or
 * has had changes requested. Author or reviewer+. Recomputes the CR's
 * `breaking` flag so the migration-notes gate stays accurate.
 */
export async function updateChangeRequestItemValue(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const crId = String(formData.get("changeRequestId") ?? "");
  const newValue = String(formData.get("value") ?? "").trim();
  if (!itemId || !crId) throw new Error("Missing item or change request id.");
  if (!newValue) throw new Error("Value cannot be empty.");

  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data: itemRow } = await supabase
    .from("change_request_items")
    .select("id, change_request_id, kind, token_name, token_type, before_value")
    .eq("id", itemId)
    .eq("change_request_id", crId)
    .eq("workspace_id", workspace.workspaceId)
    .single();
  if (!itemRow) throw new Error("Change request item not found.");
  const item = itemRow as {
    id: string;
    change_request_id: string;
    kind: string;
    token_name: string;
    token_type: string | null;
    before_value: string | null;
  };

  if (item.kind !== "edit" && item.kind !== "add") {
    throw new Error("Lifecycle items don't carry an editable value.");
  }

  const { data: crRow } = await supabase
    .from("change_requests")
    .select("id, status")
    .eq("id", crId)
    .eq("workspace_id", workspace.workspaceId)
    .single();
  if (!crRow) throw new Error("Change request not found.");
  const cr = crRow as { id: string; status: string };
  if (cr.status !== "open" && cr.status !== "changes_requested") {
    throw new Error("This CR is no longer editable.");
  }

  // Validate the new value against current workspace state, with the proposed
  // value overlaid so refs to the same token resolve to the new one.
  const { data: tokenRows } = await supabase
    .from("tokens")
    .select("name, current_value, description")
    .eq("workspace_id", workspace.workspaceId);
  const tokensByName = new Map<string, string>();
  const descriptionsByName = new Map<string, string | null>();
  for (const row of (tokenRows ?? []) as Array<{
    name: string;
    current_value: string | null;
    description: string | null;
  }>) {
    tokensByName.set(row.name, row.current_value ?? "");
    descriptionsByName.set(row.name, row.description);
  }
  tokensByName.set(item.token_name, newValue);

  if (item.token_type) {
    const schema = await loadSchemaConfig(supabase, workspace.workspaceId);
    const v = validateToken({
      name: item.token_name,
      type: item.token_type,
      value: newValue,
      description: descriptionsByName.get(item.token_name) ?? undefined,
      tokensByName,
      schema,
    });
    const firstErr = v.issues.find((i) => i.severity === "error");
    if (firstErr) {
      throw new Error(
        `Validation failed on ${item.token_name}: ${firstErr.message}`,
      );
    }
  }

  await supabase
    .from("change_request_items")
    .update({ after_value: newValue } as never)
    .eq("id", item.id)
    .eq("workspace_id", workspace.workspaceId);

  // If this is an `add` kind item, the token's draft value should also follow
  // so the contributor sees the same value across the token detail page and
  // any other open CRs that reference it.
  if (item.kind === "add") {
    await supabase
      .from("tokens")
      .update({ current_value: newValue } as never)
      .eq("name", item.token_name)
      .eq("workspace_id", workspace.workspaceId)
      .eq("status", "in_review");
  }

  // Recompute `breaking` for this CR.
  const { data: items } = await supabase
    .from("change_request_items")
    .select("kind, before_value, after_value")
    .eq("change_request_id", crId)
    .eq("workspace_id", workspace.workspaceId);
  const breaking = computeBreakingForItems(
    ((items ?? []) as Array<{
      kind: string;
      before_value: string | null;
      after_value: string | null;
    }>),
  );
  await supabase
    .from("change_requests")
    .update({ breaking } as never)
    .eq("id", crId)
    .eq("workspace_id", workspace.workspaceId);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.item_updated",
    p_entity_type: "ChangeRequestItem",
    p_entity_id: item.id,
    p_after: {
      token_name: item.token_name,
      after_value: newValue,
    },
  } as never);

  revalidatePath(`/change-requests/${crId}`);
}
