"use server";

import { revalidatePath } from "next/cache";

import { dispatchExternalNotifications } from "@/lib/notifications/dispatch";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

async function reviewerGuard() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  if (ctx.workspace.role !== "reviewer" && ctx.workspace.role !== "admin") {
    throw new Error("Only reviewers can assign reviewers.");
  }
  return ctx;
}

export async function assignReviewerAction(formData: FormData): Promise<void> {
  const crId = String(formData.get("changeRequestId") ?? "").trim();
  const reviewerId = String(formData.get("reviewerId") ?? "").trim();
  if (!crId || !reviewerId) throw new Error("Missing change request or reviewer.");

  const { supabase, workspace, user } = await reviewerGuard();

  // Confirm the target user is at least a reviewer in this workspace.
  const { data: targetRow } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.workspaceId)
    .eq("user_id", reviewerId)
    .maybeSingle();
  const target = targetRow as { role: string } | null;
  if (!target) throw new Error("That user isn't in this workspace.");
  if (target.role !== "reviewer" && target.role !== "admin") {
    throw new Error("Only reviewers and admins can be assigned.");
  }

  const { data: crRow } = await supabase
    .from("change_requests")
    .select("short_id, title")
    .eq("id", crId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();
  const cr = crRow as { short_id: string; title: string } | null;
  if (!cr) throw new Error("Change request not found.");

  const { error } = await supabase
    .from("reviewer_assignments")
    .upsert(
      {
        change_request_id: crId,
        workspace_id: workspace.workspaceId,
        reviewer_id: reviewerId,
        assigned_by: user.id,
      } as never,
      { onConflict: "change_request_id,reviewer_id" } as never,
    );
  if (error) throw new Error(error.message);

  if (reviewerId !== user.id) {
    await supabase.rpc("notify_user", {
      ws_id: workspace.workspaceId,
      p_recipient: reviewerId,
      p_kind: "reviewer.assigned",
      p_entity_type: "ChangeRequest",
      p_entity_id: crId,
      p_title: `You were assigned to ${cr.short_id}`,
      p_body: cr.title,
      p_link: `/change-requests/${crId}`,
    } as never);
  }
  await dispatchExternalNotifications(workspace.workspaceId, {
    kind: "reviewer.assigned",
    title: `Reviewer assigned to ${cr.short_id}`,
    body: cr.title,
    link: `/change-requests/${crId}`,
    entityType: "ChangeRequest",
    entityId: crId,
  });

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "reviewer.assigned",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_after: { reviewer_id: reviewerId },
  } as never);

  revalidatePath(`/change-requests/${crId}`);
}

export async function unassignReviewerAction(
  formData: FormData,
): Promise<void> {
  const crId = String(formData.get("changeRequestId") ?? "").trim();
  const reviewerId = String(formData.get("reviewerId") ?? "").trim();
  if (!crId || !reviewerId) throw new Error("Missing change request or reviewer.");

  const { supabase, workspace } = await reviewerGuard();

  const { error } = await supabase
    .from("reviewer_assignments")
    .delete()
    .eq("change_request_id", crId)
    .eq("reviewer_id", reviewerId)
    .eq("workspace_id", workspace.workspaceId);
  if (error) throw new Error(error.message);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "reviewer.unassigned",
    p_entity_type: "ChangeRequest",
    p_entity_id: crId,
    p_after: { reviewer_id: reviewerId },
  } as never);

  revalidatePath(`/change-requests/${crId}`);
}
