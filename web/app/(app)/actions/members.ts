"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { WorkspaceRole } from "@/lib/supabase/types";

const ROLES: ReadonlyArray<WorkspaceRole> = [
  "viewer",
  "contributor",
  "reviewer",
  "admin",
];

async function adminGuard() {
  const ctx = await getCurrentWorkspaceOrRedirect();
  if (ctx.workspace.role !== "admin") {
    throw new Error("Only admins can manage members.");
  }
  return ctx;
}

async function countAdmins(
  supabase: Awaited<
    ReturnType<typeof getCurrentWorkspaceOrRedirect>
  >["supabase"],
  workspaceId: string,
): Promise<number> {
  const { count } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("role", "admin");
  return count ?? 0;
}

export async function updateMemberRoleAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as WorkspaceRole;
  if (!userId) throw new Error("Missing user id.");
  if (!ROLES.includes(role)) throw new Error("Invalid role.");

  const { supabase, workspace, user } = await adminGuard();

  const { data: existingRow } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const existing = existingRow as { role: WorkspaceRole } | null;
  if (!existing) throw new Error("Member not found.");
  if (existing.role === role) return;

  // Block the last-admin-demotes-themselves footgun.
  if (existing.role === "admin" && role !== "admin") {
    const admins = await countAdmins(supabase, workspace.workspaceId);
    if (admins <= 1) {
      throw new Error("Promote another member to admin before stepping down.");
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role } as never)
    .eq("workspace_id", workspace.workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "user.role_changed",
    p_entity_type: "WorkspaceMember",
    p_entity_id: userId,
    p_before: { role: existing.role },
    p_after: { role, actor_id: user.id },
  } as never);

  revalidatePath("/settings");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Missing user id.");

  const { supabase, workspace } = await adminGuard();

  const { data: existingRow } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const existing = existingRow as { role: WorkspaceRole } | null;
  if (!existing) return;

  if (existing.role === "admin") {
    const admins = await countAdmins(supabase, workspace.workspaceId);
    if (admins <= 1) {
      throw new Error("Can't remove the last admin.");
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspace.workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "user.removed",
    p_entity_type: "WorkspaceMember",
    p_entity_id: userId,
    p_before: { role: existing.role },
  } as never);

  revalidatePath("/settings");
}
