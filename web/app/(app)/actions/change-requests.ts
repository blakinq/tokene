"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateToken } from "@/lib/core/validation";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
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

  const { data: cr, error: crError } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title: title || `Promote ${tok.name}`,
      description: description || null,
      status: "open",
      author_id: user.id,
    } as never)
    .select("id")
    .single();

  if (crError || !cr) {
    return { ok: false, error: crError?.message ?? "Failed to create CR." };
  }

  const crId = (cr as { id: string }).id;

  await supabase.from("change_request_items").insert({
    change_request_id: crId,
    workspace_id: workspace.workspaceId,
    kind: tok.status === "draft" ? "add" : "edit",
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
    crId,
    "in_review",
    ["draft"],
  );

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
  } as never);

  revalidatePath("/change-requests");
  return { ok: true, id: crId };
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
  const tokenIds = formData.getAll("tokenIds").map((x) => String(x));

  if (!title) return { ok: false, error: "Title is required." };

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { count } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: cr, error: crErr } = await supabase
    .from("change_requests")
    .insert({
      workspace_id: workspace.workspaceId,
      short_id: shortId,
      title,
      description: description || null,
      status: "open",
      author_id: user.id,
    } as never)
    .select("id")
    .single();

  if (crErr || !cr) {
    return { ok: false, error: crErr?.message ?? "Failed to create CR." };
  }
  const crId = (cr as { id: string }).id;

  if (tokenIds.length > 0) {
    const { data: toks } = await supabase
      .from("tokens")
      .select("id, name, type, level, current_value, status")
      .eq("workspace_id", workspace.workspaceId)
      .in("id", tokenIds);

    const rows = ((toks ?? []) as Array<{
      id: string;
      name: string;
      type: string;
      level: string;
      current_value: string | null;
      status: string;
    }>).map((t, i) => ({
      change_request_id: crId,
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
    crId,
    "in_review",
    ["draft"],
  );

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "change_request.submitted",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
  } as never);

  revalidatePath("/change-requests");
  redirect(`/change-requests/${crId}`);
}

export async function approveChangeRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

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
    .select("name, current_value")
    .eq("workspace_id", workspace.workspaceId);

  const tokensByName = new Map<string, string>();
  for (const row of (tokenRows ?? []) as Array<{
    name: string;
    current_value: string | null;
  }>) {
    tokensByName.set(row.name, row.current_value ?? "");
  }
  // Layer the CR's own edits into the resolution map so references between
  // sibling items resolve.
  for (const it of items) {
    if (it.after_value) tokensByName.set(it.token_name, it.after_value);
  }

  for (const it of items) {
    if (!it.after_value || !it.token_type) continue;
    const v = validateToken({
      name: it.token_name,
      type: it.token_type,
      value: it.after_value,
      tokensByName,
    });
    const firstErr = v.issues.find((i) => i.severity === "error");
    if (firstErr) {
      throw new Error(
        `Validation failed on ${it.token_name}: ${firstErr.message}`,
      );
    }
  }

  await supabase.from("reviews").insert({
    change_request_id: id,
    workspace_id: workspace.workspaceId,
    reviewer_id: user.id,
    decision: "approve",
  } as never);

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

  revalidatePath(`/change-requests/${id}`);
  revalidatePath("/change-requests");
}

export async function requestChangesOnCR(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  await supabase.from("reviews").insert({
    change_request_id: id,
    workspace_id: workspace.workspaceId,
    reviewer_id: user.id,
    decision: "request_changes",
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

  revalidatePath(`/change-requests/${id}`);
}
