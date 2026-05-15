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
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { ImportJobStatus } from "@/lib/supabase/types";

type JobRow = {
  id: string;
  status: ImportJobStatus;
  source_filename: string | null;
  parsed_tokens: Array<unknown>;
  conflicts: Array<unknown>;
  change_request_id: string | null;
  created_by: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<
  ImportJobStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  parsed: { label: "Awaiting review", variant: "secondary" },
  committed: { label: "Committed", variant: "default" },
  discarded: { label: "Discarded", variant: "outline" },
};

export default async function ImportsPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data: jobsRaw } = await supabase
    .from("import_jobs")
    .select(
      "id, status, source_filename, parsed_tokens, conflicts, change_request_id, created_by, created_at",
    )
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobs = (jobsRaw ?? []) as unknown as JobRow[];
  const profilesById = await loadProfiles(
    supabase,
    jobs.map((j) => j.created_by),
  );

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
            Bring tokens in from JSON. Each upload is parsed and previewed
            before becoming a draft change request.
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
              Each import is linked to the change request it created (if any).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
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
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Conflicts</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => {
                    const meta = STATUS_LABEL[j.status];
                    const actorName = formatActorName(
                      j.created_by
                        ? profilesById.get(j.created_by)
                        : undefined,
                    );
                    const initials = actorName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <TableRow key={j.id}>
                        <TableCell>
                          <Link
                            href={`/imports/${j.id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            {j.source_filename ?? "(paste)"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={meta.variant}
                            className="font-normal"
                          >
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {j.parsed_tokens.length}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {j.conflicts.length}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5">
                              <AvatarFallback className="text-[9px]">
                                {initials || "·"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground text-xs">
                              {actorName} · {formatRelativeDate(j.created_at)}
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

        {jobs.length > 0 ? (
          <Card>
            <CardContent>
              <Badge variant="outline" className="font-normal">
                Showing the latest {jobs.length} import
                {jobs.length === 1 ? "" : "s"}.
              </Badge>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
