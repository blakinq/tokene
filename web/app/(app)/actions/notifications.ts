"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { NotificationKind } from "@/lib/supabase/types";

type NotificationRowSlim = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationsPayload = {
  unreadCount: number;
  items: NotificationItem[];
};

export async function loadMyNotifications(): Promise<NotificationsPayload> {
  const { supabase, user, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, kind, title, body, link, read_at, created_at",
    )
    .eq("recipient_id", user.id)
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return { unreadCount: 0, items: [] };
  }

  const rows = (data ?? []) as NotificationRowSlim[];

  const items: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    link: r.link,
    read: Boolean(r.read_at),
    createdAt: r.created_at,
  }));

  const unreadCount = items.filter((i) => !i.read).length;
  return { unreadCount, items };
}

export async function markNotificationsRead(
  ids: string[] | null,
): Promise<number> {
  const { supabase } = await getCurrentWorkspaceOrRedirect();
  const { data } = await supabase.rpc("mark_notifications_read", {
    p_ids: ids,
  } as never);
  revalidatePath("/", "layout");
  return typeof data === "number" ? data : 0;
}
