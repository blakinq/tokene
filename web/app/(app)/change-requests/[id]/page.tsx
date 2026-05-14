import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { ChangeRequestStatusBadge } from "@/components/status-badge";
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import {
  approveChangeRequest,
  requestChangesOnCR,
} from "@/app/(app)/actions/change-requests";
import { deleteCommentFromCR } from "@/app/(app)/actions/comments";
import { publishReleaseFromCR } from "@/app/(app)/actions/releases";
import type {
  ChangeRequestStatus,
  ChangeRequestItemKind,
} from "@/lib/supabase/types";
import { CommentForm } from "./comment-form";

type CRRow = {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  breaking: boolean;
  stale: boolean;
  stale_reason: string | null;
  updated_at: string;
  author_id: string | null;
  items: {
    id: string;
    kind: ChangeRequestItemKind;
    token_name: string;
    before_value: string | null;
    after_value: string | null;
    note: string | null;
  }[];
  reviews: {
    id: string;
    decision: "approve" | "request_changes" | "comment";
    reviewer_id: string | null;
    created_at: string;
  }[];
};

type CommentRow = {
  id: string;
  body: string;
  author_id: string | null;
  created_at: string;
};

export default async function ChangeRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("change_requests")
    .select(
      "id, short_id, title, description, status, breaking, stale, stale_reason, updated_at, author_id, " +
        "items:change_request_items(id, kind, token_name, before_value, after_value, note), " +
        "reviews(id, decision, created_at, reviewer_id)",
    )
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const cr = data as unknown as CRRow;

  const { data: commentsRaw } = await supabase
    .from("comments")
    .select("id, body, author_id, created_at")
    .eq("change_request_id", cr.id)
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: true });

  const comments = (commentsRaw ?? []) as unknown as CommentRow[];

  const profilesById = await loadProfiles(supabase, [
    cr.author_id,
    ...cr.reviews.map((r) => r.reviewer_id),
    ...comments.map((c) => c.author_id),
  ]);

  const authorName = formatActorName(
    cr.author_id ? profilesById.get(cr.author_id) : undefined,
  );

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Change requests", href: "/change-requests" },
          { label: cr.short_id },
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
            <Link href="/change-requests">
              <ArrowLeft data-icon="inline-start" />
              All change requests
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-sm">
                  {cr.short_id}
                </span>
                <ChangeRequestStatusBadge status={cr.status} />
                {cr.breaking ? (
                  <Badge variant="destructive" className="font-normal">
                    Breaking
                  </Badge>
                ) : null}
              </div>
              <h1 className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                {cr.title}
              </h1>
              {cr.description ? (
                <p className="text-muted-foreground max-w-2xl text-sm">
                  {cr.description}
                </p>
              ) : null}
            </div>
            <CRActions status={cr.status} stale={cr.stale} crId={cr.id} />
          </div>
          {cr.stale ? (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Stale — needs re-review</AlertTitle>
              <AlertDescription>
                {cr.stale_reason ??
                  "Workspace state changed after this request was opened. Re-validate before approving."}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Changes
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {cr.items.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Token-level edits in this change request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cr.items.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No changes attached.
                  </p>
                ) : (
                  <ol className="flex flex-col">
                    {cr.items.map((item) => (
                      <li
                        key={item.id}
                        className="border-border/60 flex flex-col gap-2 border-b py-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-mono font-normal capitalize"
                          >
                            {item.kind}
                          </Badge>
                          <span className="font-mono text-sm">
                            {item.token_name}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div className="bg-muted/40 rounded-md p-3">
                            <div className="text-muted-foreground mb-1 text-xs">
                              Before
                            </div>
                            <div className="font-mono text-sm">
                              {item.before_value ?? (
                                <span className="text-muted-foreground italic">
                                  (new)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="bg-muted/40 rounded-md p-3">
                            <div className="text-muted-foreground mb-1 text-xs">
                              After
                            </div>
                            <div className="font-mono text-sm">
                              {item.after_value ?? "—"}
                            </div>
                          </div>
                        </div>
                        {item.note ? (
                          <p className="text-muted-foreground text-xs">
                            {item.note}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Comments
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {comments.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Discuss this change with reviewers and the author.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No comments yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {comments.map((c) => {
                      const profile = c.author_id
                        ? profilesById.get(c.author_id)
                        : undefined;
                      const name = formatActorName(profile);
                      const initials = name
                        .split(/\s+/)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <li
                          key={c.id}
                          className="border-border/60 flex gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                        >
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className="text-xs">
                              {initials || "·"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">{name}</span>
                              <span className="text-muted-foreground">
                                {formatRelativeDate(c.created_at)}
                              </span>
                              <form
                                action={deleteCommentFromCR}
                                className="ml-auto"
                              >
                                <input
                                  type="hidden"
                                  name="commentId"
                                  value={c.id}
                                />
                                <input
                                  type="hidden"
                                  name="changeRequestId"
                                  value={cr.id}
                                />
                                <button
                                  type="submit"
                                  className="text-muted-foreground hover:text-destructive text-xs"
                                  aria-label="Delete comment"
                                >
                                  Delete
                                </button>
                              </form>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {c.body}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <CommentForm changeRequestId={cr.id} />
              </CardContent>
            </Card>

            {cr.status === "approved" && !cr.stale ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Publish to a release
                  </CardTitle>
                  <CardDescription>
                    Apply these changes as an immutable, versioned snapshot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={publishReleaseFromCR}>
                    <input
                      type="hidden"
                      name="changeRequestId"
                      value={cr.id}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={crypto.randomUUID()}
                    />
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="version">Version</FieldLabel>
                        <Input
                          id="version"
                          name="version"
                          placeholder="2.4.0"
                          className="font-mono"
                          required
                        />
                        <FieldDescription>
                          Semver. Workspace-unique.
                        </FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="summary">
                          Changelog summary
                        </FieldLabel>
                        <Input
                          id="summary"
                          name="summary"
                          placeholder="What does this release do?"
                        />
                      </Field>
                      <div className="flex justify-end">
                        <Button type="submit">Publish release</Button>
                      </div>
                    </FieldGroup>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Author
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {authorName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{authorName}</span>
                    <span className="text-muted-foreground text-xs">
                      Updated {formatRelativeDate(cr.updated_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Reviews
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {cr.reviews.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col">
                  {cr.reviews.length === 0 ? (
                    <li className="text-muted-foreground text-sm">
                      No reviews yet.
                    </li>
                  ) : null}
                  {cr.reviews.map((r) => {
                    const reviewerName = formatActorName(
                      r.reviewer_id ? profilesById.get(r.reviewer_id) : undefined,
                    );
                    return (
                      <li
                        key={r.id}
                        className="border-border/60 flex items-center gap-3 border-b py-2 last:border-b-0"
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="text-xs">
                            {reviewerName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{reviewerName}</span>
                        <Badge
                          variant={
                            r.decision === "approve"
                              ? "default"
                              : r.decision === "request_changes"
                                ? "destructive"
                                : "outline"
                          }
                          className="ml-auto font-normal capitalize"
                        >
                          {r.decision.replace("_", " ")}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function CRActions({
  status,
  stale,
  crId,
}: {
  status: ChangeRequestStatus;
  stale: boolean;
  crId: string;
}) {
  if (status === "open" || status === "changes_requested") {
    return (
      <div className="flex items-center gap-2">
        <form action={requestChangesOnCR}>
          <input type="hidden" name="id" value={crId} />
          <Button type="submit" variant="outline" size="sm">
            Request changes
          </Button>
        </form>
        <form action={approveChangeRequest}>
          <input type="hidden" name="id" value={crId} />
          <Button type="submit" size="sm" disabled={stale}>
            <Check data-icon="inline-start" />
            Approve
          </Button>
        </form>
      </div>
    );
  }
  return null;
}
