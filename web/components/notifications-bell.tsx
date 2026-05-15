"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatRelativeDate } from "@/lib/mock-data";
import {
  loadMyNotifications,
  markNotificationsRead,
  type NotificationItem,
} from "@/app/(app)/actions/notifications";

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    loadMyNotifications().then(({ items, unreadCount }) => {
      setItems(items);
      setUnread(unreadCount);
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  function onMarkAll() {
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    startTransition(async () => {
      await markNotificationsRead(ids);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
    });
  }

  function onClickItem(id: string, link: string | null) {
    startTransition(async () => {
      await markNotificationsRead([id]);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, read: true } : i)),
      );
      setUnread((u) => Math.max(0, u - 1));
    });
    if (!link) {
      setOpen(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) refresh();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell />
          {unread > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || unread === 0}
            onClick={onMarkAll}
            className="text-muted-foreground h-7 px-2 text-xs"
          >
            <CheckCheck data-icon="inline-start" />
            Mark all read
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="text-muted-foreground px-3 py-8 text-center text-xs">
              You are all caught up.
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => {
                const inner = (
                  <div className="flex flex-col gap-0.5 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {!n.read ? (
                        <span className="bg-primary size-1.5 rounded-full" />
                      ) : null}
                      <span
                        className={
                          n.read ? "text-sm" : "text-sm font-medium"
                        }
                      >
                        {n.title}
                      </span>
                    </div>
                    {n.body ? (
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {n.body}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground text-[10px]">
                      {formatRelativeDate(n.createdAt)}
                    </span>
                  </div>
                );
                return (
                  <li key={n.id} className="border-border/60 border-b last:border-b-0">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => onClickItem(n.id, n.link)}
                        className="hover:bg-accent/40 block"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onClickItem(n.id, null)}
                        className="hover:bg-accent/40 block w-full text-left"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
