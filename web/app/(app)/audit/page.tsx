import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileClock } from "lucide-react";
import Link from "next/link";
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
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
};

const SINCE_OPTIONS: Array<{ value: string; label: string; hours: number | null }> = [
  { value: "all", label: "All time", hours: null },
  { value: "24h", label: "Last 24h", hours: 24 },
  { value: "7d", label: "Last 7 days", hours: 24 * 7 },
  { value: "30d", label: "Last 30 days", hours: 24 * 30 },
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    action?: string;
    entity?: string;
    since?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  // Load member directory (used both for the actor filter dropdown and labels).
  const { data: membersRaw } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspace.workspaceId);
  const memberIds = ((membersRaw ?? []) as Array<{ user_id: string }>).map(
    (m) => m.user_id,
  );
  const memberProfiles = await loadProfiles(supabase, memberIds);

  // Distinct actions + entity types via a wide-window scan of the most recent
  // 1k rows (cheap because audit_logs is workspace-indexed).
  const { data: distinctRaw } = await supabase
    .from("audit_logs")
    .select("action, entity_type")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false })
    .limit(1000);
  const actions = new Set<string>();
  const entities = new Set<string>();
  for (const row of (distinctRaw ?? []) as Array<{
    action: string;
    entity_type: string;
  }>) {
    actions.add(row.action);
    entities.add(row.entity_type);
  }
  const actionList = Array.from(actions).sort();
  const entityList = Array.from(entities).sort();

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_id, created_at")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.actor && params.actor !== "all") {
    query = query.eq("actor_id", params.actor);
  }
  if (params.action && params.action !== "all") {
    query = query.eq("action", params.action);
  }
  if (params.entity && params.entity !== "all") {
    query = query.eq("entity_type", params.entity);
  }
  const sinceOpt = SINCE_OPTIONS.find((o) => o.value === params.since);
  if (sinceOpt && sinceOpt.hours !== null) {
    const now = new Date();
    const since = new Date(now.getTime() - sinceOpt.hours * 60 * 60 * 1000);
    query = query.gte("created_at", since.toISOString());
  }
  if (params.q) {
    query = query.ilike("entity_id", `%${params.q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as AuditRow[];
  const profilesById = await loadProfiles(
    supabase,
    rows.map((r) => r.actor_id),
  );

  // Carry the current filter set into the export URL so the download mirrors
  // what the user sees in the table.
  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && v !== "all") exportParams.set(k, v);
  }
  const exportCsvHref = `/api/audit/export?${new URLSearchParams({
    ...Object.fromEntries(exportParams),
    format: "csv",
  }).toString()}`;
  const exportJsonHref = `/api/audit/export?${new URLSearchParams({
    ...Object.fromEntries(exportParams),
    format: "json",
  }).toString()}`;

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Audit log" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Data
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Tamper-resistant record of every security-sensitive or
              production-impacting action.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={exportCsvHref} prefetch={false} download>
                <Download data-icon="inline-start" />
                Export CSV
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={exportJsonHref} prefetch={false} download>
                <Download data-icon="inline-start" />
                Export JSON
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent>
            <form
              method="GET"
              className="grid grid-cols-1 gap-3 md:grid-cols-5"
            >
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Actor</span>
                <select
                  name="actor"
                  defaultValue={params.actor ?? "all"}
                  className="bg-background h-9 rounded-md border px-2 text-sm"
                >
                  <option value="all">Anyone</option>
                  {memberIds.map((id) => {
                    const p = memberProfiles.get(id);
                    return (
                      <option key={id} value={id}>
                        {formatActorName(p, id.slice(0, 8))}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Action</span>
                <select
                  name="action"
                  defaultValue={params.action ?? "all"}
                  className="bg-background h-9 rounded-md border px-2 text-sm"
                >
                  <option value="all">Any action</option>
                  {actionList.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Entity type</span>
                <select
                  name="entity"
                  defaultValue={params.entity ?? "all"}
                  className="bg-background h-9 rounded-md border px-2 text-sm"
                >
                  <option value="all">Any entity</option>
                  {entityList.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Since</span>
                <select
                  name="since"
                  defaultValue={params.since ?? "all"}
                  className="bg-background h-9 rounded-md border px-2 text-sm"
                >
                  {SINCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted-foreground">Entity id</span>
                <Input
                  name="q"
                  placeholder="UUID prefix"
                  defaultValue={params.q ?? ""}
                  className="h-9 font-mono text-xs"
                />
              </label>
              <div className="md:col-span-5 flex justify-end gap-2">
                <Button type="submit" size="sm">
                  Apply
                </Button>
                <Button type="reset" size="sm" variant="outline" asChild>
                  <a href="/audit">Reset</a>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileClock />
              </EmptyMedia>
              <EmptyTitle>No audit entries match</EmptyTitle>
              <EmptyDescription>
                Loosen the filters above, or clear them to see everything.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((entry) => {
                    const profile = entry.actor_id
                      ? profilesById.get(entry.actor_id)
                      : undefined;
                    const actorName = formatActorName(profile, "System");
                    const initials = actorName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              <AvatarFallback className="text-[10px]">
                                {initials || "·"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{actorName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono font-normal"
                          >
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-xs">
                            {entry.entity_type}
                          </span>{" "}
                          <span className="font-mono text-xs">
                            {entry.entity_id?.slice(0, 8) ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs">
                          {formatRelativeDate(entry.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
