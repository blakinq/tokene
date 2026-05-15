"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { extractReferences } from "@/lib/core/references";
import { parseTokensJson } from "@/lib/core/importer";
import { validateToken } from "@/lib/core/validation";
import { dispatchExternalNotifications } from "@/lib/notifications/dispatch";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";
import type { TokenType } from "@/lib/supabase/types";

/**
 * §14.6: keep imports bounded. 1 MiB of JSON is more than enough for a real
 * design system and protects the parser + DB from accidental megafiles.
 */
const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_IMPORT_TOKENS = 5000;

export type ImportParseState =
  | { ok: true; jobId: string }
  | { ok: false; error: string }
  | null;

type ConflictRow = {
  kind:
    | "new_token"
    | "duplicate_unchanged"
    | "duplicate_changed"
    | "invalid_token"
    | "missing_reference";
  name: string;
  type: TokenType;
  before?: string | null;
  after?: string;
  message?: string;
};

type ParsedTokenRow = {
  name: string;
  type: TokenType;
  value: string;
  level: "primitive" | "semantic";
  /** Workspace token id when the import targets an existing token. */
  token_id?: string;
};

/**
 * §14.3 step 1: parse + validate the file, store the result in `import_jobs`,
 * redirect the user to a preview page. No tokens or CRs are created yet.
 */
export async function parseImportAction(
  _prev: ImportParseState,
  formData: FormData,
): Promise<ImportParseState> {
  const raw = String(formData.get("content") ?? "").trim();
  const filename = String(formData.get("filename") ?? "").trim() || null;

  if (!raw) return { ok: false, error: "Paste JSON or upload a file first." };
  if (Buffer.byteLength(raw, "utf8") > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: `Import payload is larger than ${MAX_IMPORT_BYTES / 1024} KiB. Split it into multiple imports.`,
    };
  }

  const parsed = parseTokensJson(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.tokens.length > MAX_IMPORT_TOKENS) {
    return {
      ok: false,
      error: `Import contains ${parsed.tokens.length} tokens — the per-import limit is ${MAX_IMPORT_TOKENS}.`,
    };
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();
  const schema = await loadSchemaConfig(supabase, workspace.workspaceId);

  const { data: existing } = await supabase
    .from("tokens")
    .select("id, name, current_value")
    .eq("workspace_id", workspace.workspaceId);

  const tokensByName = new Map<string, string>();
  const existingByName = new Map<string, { id: string; value: string | null }>();
  for (const row of existing ?? []) {
    const r = row as { id: string; name: string; current_value: string | null };
    tokensByName.set(r.name, r.current_value ?? "");
    existingByName.set(r.name, { id: r.id, value: r.current_value });
  }
  for (const t of parsed.tokens) {
    if (!tokensByName.has(t.name)) tokensByName.set(t.name, t.value);
  }

  const conflicts: ConflictRow[] = [];
  const usable: ParsedTokenRow[] = [];

  for (const t of parsed.tokens) {
    const v = validateToken({
      name: t.name,
      type: t.type,
      value: t.value,
      tokensByName,
      schema,
    });
    const errs = v.issues.filter((i) => i.severity === "error");
    if (errs.length > 0) {
      const first = errs[0];
      conflicts.push({
        kind: first.code.startsWith("ref.") ? "missing_reference" : "invalid_token",
        name: t.name,
        type: t.type,
        message: first.message,
      });
      continue;
    }

    const ex = existingByName.get(t.name);
    const refs = extractReferences(t.value);
    const level: ParsedTokenRow["level"] = refs.length === 0 ? "primitive" : "semantic";

    if (ex) {
      if ((ex.value ?? "") === t.value) {
        conflicts.push({
          kind: "duplicate_unchanged",
          name: t.name,
          type: t.type,
          before: ex.value,
          after: t.value,
        });
      } else {
        conflicts.push({
          kind: "duplicate_changed",
          name: t.name,
          type: t.type,
          before: ex.value,
          after: t.value,
        });
        usable.push({
          name: t.name,
          type: t.type,
          value: t.value,
          level,
          token_id: ex.id,
        });
      }
    } else {
      conflicts.push({
        kind: "new_token",
        name: t.name,
        type: t.type,
        after: t.value,
      });
      usable.push({ name: t.name, type: t.type, value: t.value, level });
    }
  }

  const { data: job, error: jobErr } = await supabase
    .from("import_jobs")
    .insert({
      workspace_id: workspace.workspaceId,
      created_by: user.id,
      source_filename: filename,
      raw_payload: raw,
      parsed_tokens: usable as never,
      conflicts: conflicts as never,
    } as never)
    .select("id")
    .single();

  if (jobErr || !job) {
    return { ok: false, error: jobErr?.message ?? "Failed to save import job." };
  }

  const jobId = (job as { id: string }).id;
  revalidatePath("/imports");
  redirect(`/imports/${jobId}`);
}

/**
 * §14.3 step 2: user confirmed the preview — turn the parsed job into a CR.
 */
export async function commitImportJobAction(formData: FormData): Promise<void> {
  const jobId = String(formData.get("jobId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!jobId) throw new Error("Missing job id.");

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: jobRow } = await supabase
    .from("import_jobs")
    .select("id, status, parsed_tokens, source_filename")
    .eq("id", jobId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();
  const job = jobRow as {
    id: string;
    status: string;
    parsed_tokens: ParsedTokenRow[];
    source_filename: string | null;
  } | null;
  if (!job) throw new Error("Import job not found.");
  if (job.status !== "parsed") {
    throw new Error(`Import job is ${job.status}.`);
  }

  const usable = job.parsed_tokens ?? [];
  if (usable.length === 0) {
    throw new Error("Nothing to import — every parsed token was a duplicate or invalid.");
  }

  // Look up token ids for adds (where token_id wasn't populated at parse time
  // because the token didn't exist yet).
  type Plan =
    | { kind: "add"; name: string; type: string; level: string; value: string }
    | {
        kind: "edit";
        tokenId: string;
        name: string;
        type: string;
        level: string;
        before: string | null;
        after: string;
      };
  const adds = usable.filter((u) => !u.token_id);
  const edits = usable.filter((u) => !!u.token_id);

  // Pull current values for the edit set to populate before_value.
  let beforeByName = new Map<string, string | null>();
  if (edits.length > 0) {
    const { data: rows } = await supabase
      .from("tokens")
      .select("name, current_value")
      .eq("workspace_id", workspace.workspaceId)
      .in("name", edits.map((e) => e.name));
    for (const r of (rows ?? []) as Array<{
      name: string;
      current_value: string | null;
    }>) {
      beforeByName.set(r.name, r.current_value);
    }
  }

  const plan: Plan[] = [
    ...adds.map((a) => ({
      kind: "add" as const,
      name: a.name,
      type: a.type,
      level: a.level,
      value: a.value,
    })),
    ...edits.map((e) => ({
      kind: "edit" as const,
      tokenId: e.token_id!,
      name: e.name,
      type: e.type,
      level: e.level,
      before: beforeByName.get(e.name) ?? null,
      after: e.value,
    })),
  ];

  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;
  const finalTitle = title || `Import ${plan.length} tokens`;

  const breaking = plan.some(
    (p) => p.kind === "edit" && (p.before ?? "") !== p.after,
  );

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: finalTitle,
      description: `Imported${job.source_filename ? ` from ${job.source_filename}` : ""}. ${adds.length} new, ${edits.length} edited.`,
      status: "open",
      breaking,
      author_id: user.id,
    } as never)
    .select("id, short_id, title")
    .single();

  if (crErr || !cr) {
    throw new Error(crErr?.message ?? "Failed to create change request.");
  }
  const crRow = cr as { id: string; short_id: string; title: string };
  const crId = crRow.id;

  let position = 0;
  for (const step of plan) {
    let tokenId: string;
    if (step.kind === "add") {
      const { data: inserted, error: insErr } = await supabase
        .from("tokens")
        .insert({
          workspace_id: workspace.workspaceId,
          name: step.name,
          type: step.type,
          level: step.level,
          status: "draft",
          current_value: step.value,
          current_resolved_value: step.value,
          created_by: user.id,
          updated_by: user.id,
        } as never)
        .select("id")
        .single();
      if (insErr || !inserted) {
        throw new Error(
          `Failed to create token ${step.name}: ${insErr?.message ?? "unknown"}`,
        );
      }
      tokenId = (inserted as { id: string }).id;
    } else {
      tokenId = step.tokenId;
    }

    await supabase.from("change_request_items").insert({
      change_request_id: crId,
      workspace_id: workspace.workspaceId,
      kind: step.kind,
      token_id: tokenId,
      token_name: step.name,
      token_type: step.type,
      token_level: step.level,
      before_value: step.kind === "edit" ? step.before : null,
      after_value: step.kind === "edit" ? step.after : step.value,
      position: position++,
    } as never);

    if (step.kind === "add") {
      await supabase
        .from("tokens")
        .update({ status: "in_review" } as never)
        .eq("id", tokenId)
        .eq("workspace_id", workspace.workspaceId)
        .eq("status", "draft");
    }
  }

  await supabase
    .from("import_jobs")
    .update({
      status: "committed",
      change_request_id: crId,
      committed_at: new Date().toISOString(),
    } as never)
    .eq("id", jobId)
    .eq("workspace_id", workspace.workspaceId);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "import.created",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_after: {
      count: plan.length,
      added: adds.length,
      edited: edits.length,
      job_id: jobId,
    },
  } as never);

  await supabase.rpc("notify_workspace", {
    ws_id: workspace.workspaceId,
    p_kind: "import.completed",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_title: `Import ready for review (${plan.length} tokens)`,
    p_body: crRow.title,
    p_link: `/change-requests/${crId}`,
    p_exclude_actor: true,
    p_role_at_least: "reviewer",
  } as never);
  await dispatchExternalNotifications(workspace.workspaceId, {
    kind: "import.completed",
    title: `Import ready for review (${plan.length} tokens)`,
    body: crRow.title,
    link: `/change-requests/${crId}`,
    entityType: "ChangeRequest",
    entityId: crId,
  });

  revalidatePath("/imports");
  revalidatePath("/change-requests");
  redirect(`/change-requests/${crId}`);
}

export async function discardImportJobAction(formData: FormData): Promise<void> {
  const jobId = String(formData.get("jobId") ?? "").trim();
  if (!jobId) return;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  await supabase
    .from("import_jobs")
    .update({ status: "discarded" } as never)
    .eq("id", jobId)
    .eq("workspace_id", workspace.workspaceId)
    .eq("status", "parsed");
  revalidatePath("/imports");
  redirect("/imports");
}
