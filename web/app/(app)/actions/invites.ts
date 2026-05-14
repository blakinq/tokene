"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { WorkspaceRole } from "@/lib/supabase/types";

const ROLE_VALUES: ReadonlyArray<WorkspaceRole> = [
  "viewer",
  "contributor",
  "reviewer",
  "admin",
];

export type CreateInviteState =
  | { ok: true; url: string; email: string }
  | { ok: false; error: string }
  | null;

function originFromHeaders(): string {
  // Server actions don't expose Request, so fall back to env. The app sets
  // NEXT_PUBLIC_SITE_URL on Vercel; in dev, default to localhost.
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
}

export async function createInviteAction(
  _prev: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const rawRole = String(formData.get("role") ?? "contributor");
  const role = (ROLE_VALUES as ReadonlyArray<string>).includes(rawRole)
    ? (rawRole as WorkspaceRole)
    : "contributor";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    return { ok: false, error: "Only admins can invite members." };
  }

  const token = randomBytes(24).toString("base64url");

  const { error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspace.workspaceId,
      email,
      role,
      token,
      invited_by: user.id,
    } as never);

  if (error) {
    // Surface the unique-pending-invite collision in friendly language.
    if (error.code === "23505") {
      return {
        ok: false,
        error: "There's already a pending invite for that email.",
      };
    }
    return { ok: false, error: error.message };
  }

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "invite.created",
    p_entity_type: "WorkspaceInvite",
    p_entity_id: token,
    p_after: { email, role },
  } as never);

  revalidatePath("/settings");

  return {
    ok: true,
    url: `${originFromHeaders()}/invite/${token}`,
    email,
  };
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") return;

  await supabase
    .from("workspace_invites")
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "invite.revoked",
    p_entity_type: "WorkspaceInvite",
    p_entity_id: id,
  } as never);

  revalidatePath("/settings");
}
