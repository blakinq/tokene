import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  commitImportJobAction,
  discardImportJobAction,
} from "@/app/(app)/actions/imports";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { ImportJobStatus, TokenType } from "@/lib/supabase/types";

type ConflictRow = {
  kind:
    | "new_token"
    | "duplicate_unchanged"
    | "duplicate_changed"
    | "invalid_token"
    | "missing_reference";
  name: string;
  type: TokenType;
  before?: string | null;
  after?: string;
  message?: string;
};

type ParsedTokenRow = {
  name: string;
  type: TokenType;
  value: string;
  level: "primitive" | "semantic";
  token_id?: string;
};

const KIND_LABEL: Record<ConflictRow["kind"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new_token: { label: "New", variant: "default" },
  duplicate_unchanged: { label: "Unchanged", variant: "outline" },
  duplicate_changed: { label: "Changed", variant: "secondary" },
  invalid_token: { label: "Invalid", variant: "destructive" },
  missing_reference: { label: "Missing ref", variant: "destructive" },
};

export default async function ImportPreviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data: jobRow } = await supabase
    .from("import_jobs")
    .select(
      "id, status, source_filename, parsed_tokens, conflicts, change_request_id, created_at",
    )
    .eq("id", jobId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();
  if (!jobRow) notFound();

  const job = jobRow as {
    id: string;
    status: ImportJobStatus;
    source_filename: string | null;
    parsed_tokens: ParsedTokenRow[];
    conflicts: ConflictRow[];
    change_request_id: string | null;
    created_at: string;
  };

  const usableCount = job.parsed_tokens.length;
  const conflicts = job.conflicts ?? [];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Imports", href: "/imports" },
          { label: job.source_filename ?? "Preview" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground -ml-2 w-fit"
          >
            <Link href="/imports">
              <ArrowLeft data-icon="inline-start" />
              All imports
            </Link>
          </Button>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Data
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              Import preview
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              {job.status === "parsed"
                ? "Confirm the changes before turning this import into a draft change request."
                : job.status === "committed"
                  ? "This import has already been turned into a change request."
                  : "This import was discarded."}
            </p>
          </div>
        </div>

        {job.status === "committed" && job.change_request_id ? (
          <Alert>
            <AlertTitle>Already committed</AlertTitle>
            <AlertDescription>
              <Link
                href={`/change-requests/${job.change_request_id}`}
                className="underline"
              >
                View the change request
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Tokens
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {conflicts.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Each row is categorized by how it compares against your
                  current workspace state.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Token</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map((c, i) => {
                      const meta = KIND_LABEL[c.kind];
                      return (
                        <TableRow key={`${c.name}-${i}`}>
                          <TableCell className="font-mono text-xs">
                            {c.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs capitalize">
                            {c.type.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={meta.variant}
                              className="font-normal"
                            >
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {c.kind === "duplicate_changed" ? (
                              <>
                                <span className="text-muted-foreground line-through">
                                  {c.before}
                                </span>{" "}
                                <span>→ {c.after}</span>
                              </>
                            ) : c.kind === "invalid_token" ||
                              c.kind === "missing_reference" ? (
                              <span className="text-destructive">
                                {c.message ?? c.after ?? ""}
                              </span>
                            ) : (
                              <span>{c.after ?? c.before ?? ""}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Summary
                </CardTitle>
                <CardDescription>
                  {usableCount} token{usableCount === 1 ? "" : "s"} would land
                  in a new draft CR.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col">
                  {Object.entries(
                    conflicts.reduce<Record<string, number>>((acc, c) => {
                      acc[c.kind] = (acc[c.kind] ?? 0) + 1;
                      return acc;
                    }, {}),
                  ).map(([kind, count]) => {
                    const meta =
                      KIND_LABEL[kind as ConflictRow["kind"]] ??
                      ({ label: kind, variant: "outline" } as const);
                    return (
                      <div
                        key={kind}
                        className="border-border/60 flex items-center justify-between border-b py-2 last:border-b-0"
                      >
                        <Badge
                          variant={meta.variant}
                          className="font-normal"
                        >
                          {meta.label}
                        </Badge>
                        <span className="font-mono text-sm">{count}</span>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>

            {job.status === "parsed" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Create change request
                  </CardTitle>
                  <CardDescription>
                    Bundles the {usableCount} actionable token
                    {usableCount === 1 ? "" : "s"} into a single CR.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <form action={commitImportJobAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="title">
                          Title{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          id="title"
                          name="title"
                          placeholder={
                            job.source_filename
                              ? `Import ${job.source_filename}`
                              : `Import ${usableCount} tokens`
                          }
                        />
                      </Field>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={usableCount === 0}>
                          Create CR ({usableCount})
                        </Button>
                      </div>
                    </FieldGroup>
                  </form>
                  <form
                    action={discardImportJobAction}
                    className="border-border/60 flex justify-end border-t pt-3"
                  >
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Discard this import
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
