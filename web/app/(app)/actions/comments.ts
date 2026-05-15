"use server";

import { revalidatePath } from "next/cache";

import { dispatchExternalNotifications } from "@/lib/notifications/dispatch";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

const MENTION_PATTERN = /@([A-Za-z0-9._-]+)/g;

function extractMentions(body: string): string[] {
  const matches = [...body.matchAll(MENTION_PATTERN)].map((m) => m[1]);
  return Array.from(new Set(matches.map((s) => s.toLowerCase())));
}

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
    .select("id, short_id, title")
    .eq("id", changeRequestId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();
  if (!cr) throw new Error("Change request not found.");
  const crRow = cr as { id: string; short_id: string; title: string };

  const { error } = await supabase.from("comments").insert({
    change_request_id: changeRequestId,
    workspace_id: workspace.workspaceId,
    author_id: user.id,
    body,
  } as never);

  if (error) throw new Error(error.message);

  // §15.3 comment.mention: best-effort match @handles against workspace
  // member display_name or email-local-part; notify each unique match once.
  const mentions = extractMentions(body);
  if (mentions.length > 0) {
    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace.workspaceId);
    const memberIds = ((members ?? []) as Array<{ user_id: string }>).map(
      (m) => m.user_id,
    );
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", memberIds);
      const candidates = ((profiles ?? []) as Array<{
        id: string;
        email: string;
        display_name: string | null;
      }>).filter((p) => p.id !== user.id);

      const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ".");
      const matched = new Set<string>();
      for (const m of mentions) {
        for (const c of candidates) {
          const localPart = c.email.split("@")[0]?.toLowerCase() ?? "";
          const display = c.display_name ? normalized(c.display_name) : "";
          if (m === localPart || (display && m === display)) {
            matched.add(c.id);
          }
        }
      }

      for (const recipient of matched) {
        await supabase.rpc("notify_user", {
          ws_id: workspace.workspaceId,
          p_recipient: recipient,
          p_kind: "comment.mention",
          p_entity_type: "ChangeRequest",
          p_entity_id: changeRequestId,
          p_title: `Mentioned in ${crRow.short_id}`,
          p_body: body.slice(0, 200),
          p_link: `/change-requests/${changeRequestId}`,
        } as never);
      }
      if (matched.size > 0) {
        await dispatchExternalNotifications(workspace.workspaceId, {
          kind: "comment.mention",
          title: `Mentioned in ${crRow.short_id}`,
          body: body.slice(0, 200),
          link: `/change-requests/${changeRequestId}`,
          entityType: "ChangeRequest",
          entityId: changeRequestId,
        });
      }
    }
  }

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
