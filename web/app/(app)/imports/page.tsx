import Link from "next/link";
import { CloudUpload, FileJson, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SiteHeader } from "@/components/site-header";
import { ChangeRequestStatusBadge } from "@/components/status-badge";
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { ChangeRequestStatus } from "@/lib/supabase/types";

type AuditEntry = {
  id: string;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
  after_value: { count?: number; added?: number; edited?: number } | null;
};

type CRRow = {
  id: string;
  short_id: string;
  title: string;
  status: ChangeRequestStatus;
};

export default async function ImportsPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data: entriesRaw } = await supabase
    .from("audit_logs")
    .select("id, entity_id, actor_id, created_at, after_value")
    .eq("workspace_id", workspace.workspaceId)
    .eq("action", "import.created")
    .order("created_at", { ascending: false })
    .limit(50);

  const entries = (entriesRaw ?? []) as unknown as AuditEntry[];
  const profilesById = await loadProfiles(
    supabase,
    entries.map((e) => e.actor_id),
  );

  const crIds = entries
    .map((e) => e.entity_id)
    .filter((x): x is string => Boolean(x));

  let crsById = new Map<string, CRRow>();
  if (crIds.length > 0) {
    const { data: crData } = await supabase
      .from("change_requests")
      .select("id, short_id, title, status")
      .eq("workspace_id", workspace.workspaceId)
      .in("id", crIds);
    crsById = new Map(
      ((crData ?? []) as unknown as CRRow[]).map((c) => [c.id, c]),
    );
  }

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Imports" },
        ]}
        primaryAction={{ label: "Upload file", href: "/imports/new" }}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Data
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Imports</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Bring tokens in from JSON. Every import is parsed safely and turned
            into a draft change request before becoming a release.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
              <CloudUpload className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                Upload a JSON file, or paste tokens directly
              </p>
              <p className="text-muted-foreground text-xs">
                JSON or Style Dictionary. Imports always create a draft change
                request — they never publish directly.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/imports/new">
                <Upload data-icon="inline-start" />
                New import
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Recent imports
            </CardTitle>
            <CardDescription>
              Each import is linked to the change request it created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileJson />
                  </EmptyMedia>
                  <EmptyTitle>No imports yet</EmptyTitle>
                  <EmptyDescription>
                    Run an import to populate this list.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Change request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Added</TableHead>
                    <TableHead className="text-right">Edited</TableHead>
                    <TableHead>Imported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const cr = entry.entity_id
                      ? crsById.get(entry.entity_id)
                      : undefined;
                    const actorName = formatActorName(
                      entry.actor_id ? profilesById.get(entry.actor_id) : undefined,
                    );
                    const initials = actorName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {cr ? (
                            <Link
                              href={`/change-requests/${cr.id}`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <span className="text-muted-foreground font-mono text-xs">
                                {cr.short_id}
                              </span>
                              <span className="text-sm">{cr.title}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              (deleted)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cr ? (
                            <ChangeRequestStatusBadge status={cr.status} />
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {entry.after_value?.count ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {entry.after_value?.added ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {entry.after_value?.edited ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5">
                              <AvatarFallback className="text-[9px]">
                                {initials || "·"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground text-xs">
                              {actorName} · {formatRelativeDate(entry.created_at)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {entries.length > 0 ? (
          <Card>
            <CardContent>
              <Badge variant="outline" className="font-normal">
                Showing the latest {entries.length} import
                {entries.length === 1 ? "" : "s"}.
              </Badge>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
