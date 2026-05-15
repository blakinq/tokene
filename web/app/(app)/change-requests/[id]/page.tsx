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
import { Textarea } from "@/components/ui/textarea";
import {
  approveChangeRequest,
  rejectChangeRequest,
  requestChangesOnCR,
  updateChangeRequestMeta,
} from "@/app/(app)/actions/change-requests";
import { deleteCommentFromCR } from "@/app/(app)/actions/comments";
import { publishReleaseFromCR } from "@/app/(app)/actions/releases";
import {
  assignReviewerAction,
  unassignReviewerAction,
} from "@/app/(app)/actions/reviewers";
import type {
  ChangeRequestStatus,
  ChangeRequestItemKind,
} from "@/lib/supabase/types";
import { CommentForm } from "./comment-form";
import { ItemValueDiff } from "./item-value-diff";
import { AmendItemForm } from "./amend-item-form";

type CRRow = {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  breaking: boolean;
  stale: boolean;
  stale_reason: string | null;
  migration_notes: string | null;
  updated_at: string;
  author_id: string | null;
  items: {
    id: string;
    kind: ChangeRequestItemKind;
    token_name: string;
    token_type: string | null;
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
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();
  const canManageReviewers =
    workspace.role === "reviewer" || workspace.role === "admin";

  const { data, error } = await supabase
    .from("change_requests")
    .select(
      "id, short_id, title, description, status, breaking, stale, stale_reason, migration_notes, updated_at, author_id, " +
        "items:change_request_items(id, kind, token_name, token_type, before_value, after_value, note), " +
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

  const { data: assignmentsRaw } = await supabase
    .from("reviewer_assignments")
    .select("id, reviewer_id, created_at")
    .eq("change_request_id", cr.id)
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: true });
  const assignments = (assignmentsRaw ?? []) as Array<{
    id: string;
    reviewer_id: string;
    created_at: string;
  }>;

  // Reviewer-or-admin members of this workspace eligible to be assigned.
  const { data: candidatesRaw } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.workspaceId)
    .in("role", ["reviewer", "admin"]);
  const eligibleReviewers = (candidatesRaw ?? []) as Array<{
    user_id: string;
    role: string;
  }>;
  const assignedSet = new Set(assignments.map((a) => a.reviewer_id));
  const assignableCandidates = eligibleReviewers.filter(
    (c) => !assignedSet.has(c.user_id),
  );

  const profilesById = await loadProfiles(supabase, [
    cr.author_id,
    ...cr.reviews.map((r) => r.reviewer_id),
    ...comments.map((c) => c.author_id),
    ...assignments.map((a) => a.reviewer_id),
    ...eligibleReviewers.map((e) => e.user_id),
  ]);
  // Tell typescript `user` is referenced (used when canManageReviewers).
  void user;

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
          {cr.breaking &&
          (cr.status === "open" || cr.status === "changes_requested") ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Migration notes
                </CardTitle>
                <CardDescription>
                  This change is breaking. Workspace settings may require notes
                  before approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={updateChangeRequestMeta}
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="id" value={cr.id} />
                  <Textarea
                    name="migrationNotes"
                    rows={4}
                    placeholder="Walk consumers through what changed and how to update."
                    defaultValue={cr.migration_notes ?? ""}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="outline">
                      Save notes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
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
                    {cr.items.map((item) => {
                      const amendable =
                        (item.kind === "edit" || item.kind === "add") &&
                        (cr.status === "open" ||
                          cr.status === "changes_requested");
                      return (
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
                            <Link
                              href={`/tokens?q=${encodeURIComponent(item.token_name)}`}
                              className="font-mono text-sm hover:underline"
                            >
                              {item.token_name}
                            </Link>
                            {item.token_type ? (
                              <Badge
                                variant="outline"
                                className="font-normal capitalize"
                              >
                                {item.token_type.replace("_", " ")}
                              </Badge>
                            ) : null}
                          </div>
                          {item.kind === "edit" || item.kind === "add" ? (
                            <ItemValueDiff
                              type={item.token_type}
                              before={item.before_value}
                              after={item.after_value}
                            />
                          ) : item.kind === "rename" ? (
                            <p className="font-mono text-xs">
                              <span className="text-muted-foreground">
                                {item.before_value}
                              </span>{" "}
                              →{" "}
                              <span className="text-foreground">
                                {item.after_value}
                              </span>
                            </p>
                          ) : null}
                          {item.note ? (
                            <p className="text-muted-foreground text-xs">
                              {item.note}
                            </p>
                          ) : null}
                          {amendable && item.token_type ? (
                            <AmendItemForm
                              itemId={item.id}
                              changeRequestId={cr.id}
                              tokenType={item.token_type}
                              currentAfter={item.after_value ?? ""}
                            />
                          ) : null}
                        </li>
                      );
                    })}
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
                  Assigned reviewers
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {assignments.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Reviewers explicitly asked to look at this change.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col">
                  {assignments.length === 0 ? (
                    <li className="text-muted-foreground py-2 text-sm">
                      None yet.
                    </li>
                  ) : null}
                  {assignments.map((a) => {
                    const profile = profilesById.get(a.reviewer_id);
                    const name = formatActorName(profile);
                    return (
                      <li
                        key={a.id}
                        className="border-border/60 flex items-center gap-3 border-b py-2 last:border-b-0"
                      >
                        <Avatar className="size-6">
                          <AvatarFallback className="text-[10px]">
                            {name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase() || "·"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{name}</span>
                        {canManageReviewers ? (
                          <form
                            action={unassignReviewerAction}
                            className="ml-auto"
                          >
                            <input
                              type="hidden"
                              name="changeRequestId"
                              value={cr.id}
                            />
                            <input
                              type="hidden"
                              name="reviewerId"
                              value={a.reviewer_id}
                            />
                            <button
                              type="submit"
                              className="text-muted-foreground hover:text-destructive text-xs"
                            >
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {canManageReviewers && assignableCandidates.length > 0 ? (
                  <form
                    action={assignReviewerAction}
                    className="border-border/60 mt-3 flex items-center gap-2 border-t pt-3"
                  >
                    <input
                      type="hidden"
                      name="changeRequestId"
                      value={cr.id}
                    />
                    <select
                      name="reviewerId"
                      defaultValue={assignableCandidates[0]?.user_id ?? ""}
                      className="bg-background h-8 flex-1 rounded-md border px-2 text-xs"
                    >
                      {assignableCandidates.map((c) => (
                        <option key={c.user_id} value={c.user_id}>
                          {formatActorName(profilesById.get(c.user_id))}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Assign
                    </Button>
                  </form>
                ) : null}
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
        <form action={rejectChangeRequest}>
          <input type="hidden" name="id" value={crId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            Reject
          </Button>
        </form>
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
