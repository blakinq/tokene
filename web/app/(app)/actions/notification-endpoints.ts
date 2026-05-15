"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

export type EndpointFormState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

const ALLOWED_EVENTS = new Set([
  "change_request.submitted",
  "change_request.approved",
  "change_request.changes_requested",
  "release.published",
]);

export async function createNotificationEndpoint(
  _prev: EndpointFormState,
  formData: FormData,
): Promise<EndpointFormState> {
  const kind = String(formData.get("kind") ?? "");
  const target = String(formData.get("target") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  const events = formData.getAll("events").map((e) => String(e));

  if (kind !== "webhook" && kind !== "email") {
    return { ok: false, error: "Pick a webhook or email endpoint." };
  }
  if (!target) {
    return { ok: false, error: "Target is required." };
  }
  if (kind === "webhook" && !/^https?:\/\//i.test(target)) {
    return { ok: false, error: "Webhook target must be a full http(s) URL." };
  }
  if (kind === "email" && !/.+@.+\..+/.test(target)) {
    return { ok: false, error: "Email target must be a valid email address." };
  }
  for (const e of events) {
    if (!ALLOWED_EVENTS.has(e)) {
      return { ok: false, error: `Unknown event: ${e}` };
    }
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    return { ok: false, error: "Only admins can manage endpoints." };
  }

  const { error } = await supabase.from("notification_endpoints").insert({
    workspace_id: workspace.workspaceId,
    kind,
    target,
    secret: kind === "webhook" && secret ? secret : null,
    event_filter: events.length > 0 ? events : null,
    enabled: true,
    created_by: user.id,
  } as never);

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "notification_endpoint.created",
    p_entity_type: "NotificationEndpoint",
    p_after: { kind, target, events },
  } as never);

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteNotificationEndpoint(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    throw new Error("Only admins can manage endpoints.");
  }
  await supabase
    .from("notification_endpoints")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId);
  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "notification_endpoint.deleted",
    p_entity_type: "NotificationEndpoint",
    p_entity_id: id,
  } as never);
  revalidatePath("/settings");
}

export async function toggleNotificationEndpoint(formData: FormData) {
  const id = String(formData.get("id"));
  const enabled = formData.get("enabled") === "true";
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    throw new Error("Only admins can manage endpoints.");
  }
  await supabase
    .from("notification_endpoints")
    .update({ enabled } as never)
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId);
  revalidatePath("/settings");
}
