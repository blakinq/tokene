"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

export async function addCommentToCR(formData: FormData): Promise<void> {
  const changeRequestId = String(formData.get("changeRequestId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!changeRequestId) throw new Error("Missing change request id.");
  if (!body) return;
  if (body.length > 4000) {
    throw new Error("Comments are limited to 4000 characters.");
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  // Ensure the CR belongs to this workspace before letting a comment through.
  const { data: cr } = await supabase
    .from("change_requests")
    .select("id")
    .eq("id", changeRequestId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();
  if (!cr) throw new Error("Change request not found.");

  const { error } = await supabase.from("comments").insert({
    change_request_id: changeRequestId,
    workspace_id: workspace.workspaceId,
    author_id: user.id,
    body,
  } as never);

  if (error) throw new Error(error.message);

  revalidatePath(`/change-requests/${changeRequestId}`);
}

export async function deleteCommentFromCR(formData: FormData): Promise<void> {
  const commentId = String(formData.get("commentId") ?? "");
  const changeRequestId = String(formData.get("changeRequestId") ?? "");
  if (!commentId) return;

  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  // RLS enforces author-or-admin deletion; this is just a workspace-scope guard.
  await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("workspace_id", workspace.workspaceId);

  if (changeRequestId) {
    revalidatePath(`/change-requests/${changeRequestId}`);
  }
}
