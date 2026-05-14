"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { extractReferences } from "@/lib/core/references";
import { parseTokensJson } from "@/lib/core/importer";
import { validateToken } from "@/lib/core/validation";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

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

  const parsed = parseTokensJson(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

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

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: finalTitle,
      description: `Imported from JSON. ${plan.filter((p) => p.kind === "add").length} new, ${plan.filter((p) => p.kind === "edit").length} edited.`,
      status: "open",
      author_id: user.id,
    } as never)
    .select("id")
    .single();

  if (crErr || !cr) {
    return { ok: false, error: crErr?.message ?? "Failed to create change request." };
  }
  const crId = (cr as { id: string }).id;

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

  revalidatePath("/imports");
  revalidatePath("/change-requests");
  redirect(`/change-requests/${crId}`);
}
