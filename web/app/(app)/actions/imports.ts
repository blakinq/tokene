"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { extractReferences } from "@/lib/core/references";
import { parseTokensJson } from "@/lib/core/importer";
import { validateToken } from "@/lib/core/validation";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";

/**
 * §14.6: keep imports bounded. 1 MiB of JSON is more than enough for a real
 * design system and protects the parser + DB from accidental megafiles.
 */
const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_IMPORT_TOKENS = 5000;

export type ImportState =
  | { ok: true; changeRequestId: string }
  | {
      ok: false;
      error: string;
      issues?: { token: string; message: string }[];
    }
  | null;

export async function importTokensAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const raw = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

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

  // Pull existing tokens by name for diffing + validation.
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
  // Seed tokensByName with the incoming tokens so references resolve within the file.
  for (const t of parsed.tokens) {
    if (!tokensByName.has(t.name)) tokensByName.set(t.name, t.value);
  }

  // Validate and split into add / edit / skip-unchanged.
  const issues: { token: string; message: string }[] = [];
  type Plan =
    | { kind: "add"; name: string; type: string; value: string }
    | {
        kind: "edit";
        tokenId: string;
        name: string;
        type: string;
        before: string | null;
        after: string;
      };
  const plan: Plan[] = [];

  for (const t of parsed.tokens) {
    const ex = existingByName.get(t.name);
    const v = validateToken({
      name: t.name,
      type: t.type,
      value: t.value,
      tokensByName,
      existingNames: new Set(), // we'll handle dupes via plan
      schema,
    });
    const errs = v.issues.filter((i) => i.severity === "error");
    if (errs.length > 0) {
      issues.push({ token: t.name, message: errs[0].message });
      continue;
    }
    if (ex) {
      if ((ex.value ?? "") === t.value) continue; // unchanged
      plan.push({
        kind: "edit",
        tokenId: ex.id,
        name: t.name,
        type: t.type,
        before: ex.value,
        after: t.value,
      });
    } else {
      plan.push({
        kind: "add",
        name: t.name,
        type: t.type,
        value: t.value,
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, error: "Some tokens failed validation.", issues };
  }
  if (plan.length === 0) {
    return {
      ok: false,
      error: "Nothing to import — every token in the file matches what's already here.",
    };
  }

  // Create the change request first.
  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;
  const finalTitle = title || `Import ${plan.length} tokens`;

  // §8.5: any value-changing edit on existing tokens is breaking. Pure adds
  // (new draft tokens) aren't.
  const breaking = plan.some(
    (p) => p.kind === "edit" && (p.before ?? "") !== p.after,
  );

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: finalTitle,
      description: `Imported from JSON. ${plan.filter((p) => p.kind === "add").length} new, ${plan.filter((p) => p.kind === "edit").length} edited.`,
      status: "open",
      breaking,
      author_id: user.id,
    } as never)
    .select("id, short_id, title")
    .single();

  if (crErr || !cr) {
    return { ok: false, error: crErr?.message ?? "Failed to create change request." };
  }
  const crRow = cr as { id: string; short_id: string; title: string };
  const crId = crRow.id;

  // For each plan entry, create the draft token (if `add`) and a change_request_item.
  let position = 0;
  for (const step of plan) {
    let tokenId: string;
    let tokenLevel = "primitive";
    if (step.kind === "add") {
      const refs = extractReferences(step.value);
      tokenLevel = refs.length === 0 ? "primitive" : "semantic";
      const { data: inserted, error: insErr } = await supabase
        .from("tokens")
        .insert({
          workspace_id: workspace.workspaceId,
          name: step.name,
          type: step.type,
          level: tokenLevel,
          status: "draft",
          current_value: step.value,
          current_resolved_value: step.value,
          created_by: user.id,
          updated_by: user.id,
        } as never)
        .select("id")
        .single();

      if (insErr || !inserted) {
        return {
          ok: false,
          error: `Failed to create token ${step.name}: ${insErr?.message ?? "unknown"}`,
        };
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
      token_level: tokenLevel,
      before_value: step.kind === "edit" ? step.before : null,
      after_value: step.kind === "edit" ? step.after : step.value,
      position: position++,
    } as never);

    // Newly-added drafts ride the same lifecycle as a user-submitted CR.
    if (step.kind === "add") {
      await supabase
        .from("tokens")
        .update({ status: "in_review" } as never)
        .eq("id", tokenId)
        .eq("workspace_id", workspace.workspaceId)
        .eq("status", "draft");
    }
  }

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "import.created",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_after: {
      count: plan.length,
      added: plan.filter((p) => p.kind === "add").length,
      edited: plan.filter((p) => p.kind === "edit").length,
    },
  } as never);

  await supabase.rpc("notify_workspace", {
    ws_id: workspace.workspaceId,
    p_kind: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_title: `${crRow.short_id} ready for review`,
    p_body: crRow.title,
    p_link: `/change-requests/${crId}`,
    p_exclude_actor: true,
    p_role_at_least: "reviewer",
  } as never);

  revalidatePath("/imports");
  revalidatePath("/change-requests");
  redirect(`/change-requests/${crId}`);
}
