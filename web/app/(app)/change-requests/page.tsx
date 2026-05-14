import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  GitPullRequest,
  MessageSquare,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { ChangeRequestStatusBadge } from "@/components/status-badge";
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { ChangeRequestStatus } from "@/lib/supabase/types";

type Row = {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  breaking: boolean;
  stale: boolean;
  updated_at: string;
  author_id: string | null;
  items: { id: string }[];
};

export default async function ChangeRequestsPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("change_requests")
    .select(
      "id, short_id, title, description, status, breaking, stale, updated_at, author_id, items:change_request_items(id)",
    )
    .eq("workspace_id", workspace.workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];
  const profilesById = await loadProfiles(
    supabase,
    rows.map((r) => r.author_id),
  );

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Change requests" },
        ]}
        primaryAction={{
          label: "New change request",
          href: "/change-requests/new",
        }}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Flow
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Change requests
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Reviewable units of work. Each change request bundles related token
            edits and runs through validation, review, and release.
          </p>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All
              <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                {rows.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GitPullRequest />
              </EmptyMedia>
              <EmptyTitle>No change requests yet</EmptyTitle>
              <EmptyDescription>
                Propose a change from any token detail page, or create one from
                scratch.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((cr) => {
              const authorName = formatActorName(
                cr.author_id ? profilesById.get(cr.author_id) : undefined,
              );
              const initials = authorName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <li key={cr.id}>
                  <Link
                    href={`/change-requests/${cr.id}`}
                    className="bg-card hover:border-foreground/30 group block rounded-lg border p-4 transition-colors"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                        <GitPullRequest className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground font-mono text-xs">
                            {cr.short_id}
                          </span>
                          <span className="text-foreground truncate text-sm font-medium">
                            {cr.title}
                          </span>
                          <ChangeRequestStatusBadge status={cr.status} />
                          {cr.breaking ? (
                            <Badge
                              variant="destructive"
                              className="font-normal"
                            >
                              Breaking
                            </Badge>
                          ) : null}
                          {cr.stale ? (
                            <Badge
                              variant="outline"
                              className="border-destructive/40 text-destructive font-normal"
                            >
                              Stale
                            </Badge>
                          ) : null}
                        </div>
                        {cr.description ? (
                          <p className="text-muted-foreground line-clamp-1 text-sm">
                            {cr.description}
                          </p>
                        ) : null}
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="flex items-center gap-1.5">
                            <Avatar className="size-4">
                              <AvatarFallback className="text-[8px]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {authorName}
                          </span>
                          <span className="font-mono">
                            {cr.items.length}{" "}
                            {cr.items.length === 1 ? "change" : "changes"}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            Checks pass
                          </span>
                          <span className="ml-auto">
                            Updated {formatRelativeDate(cr.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
