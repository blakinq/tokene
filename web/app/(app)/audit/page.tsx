import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FileClock } from "lucide-react";
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

export default async function AuditPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_id, created_at")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as AuditRow[];
  const profilesById = await loadProfiles(
    supabase,
    rows.map((r) => r.actor_id),
  );

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

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileClock />
              </EmptyMedia>
              <EmptyTitle>No audit entries yet</EmptyTitle>
              <EmptyDescription>
                Actions like publishing releases and approving change requests
                will appear here.
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
