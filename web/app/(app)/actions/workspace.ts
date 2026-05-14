"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

export type UpdateWorkspaceState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function updateWorkspaceAction(
  _prev: UpdateWorkspaceState,
  formData: FormData,
): Promise<UpdateWorkspaceState> {
  const name = String(formData.get("name") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();

  if (!name) return { ok: false, error: "Workspace name is required." };

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  if (workspace.role !== "admin") {
    return { ok: false, error: "Only admins can update workspace settings." };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      product: product || null,
    } as never)
    .eq("id", workspace.workspaceId);

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "workspace.updated",
    p_entity_type: "Workspace",
    p_entity_id: workspace.workspaceId,
    p_after: { name, product, actor_id: user.id },
  } as never);

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
