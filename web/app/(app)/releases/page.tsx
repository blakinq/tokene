import Link from "next/link";
import { Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SiteHeader } from "@/components/site-header";
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { ReleaseStatus } from "@/lib/supabase/types";

type Row = {
  id: string;
  version: string;
  status: ReleaseStatus;
  summary: string | null;
  breaking: boolean;
  published_at: string | null;
  published_by: string | null;
  snapshots: { id: string }[];
};

export default async function ReleasesPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("releases")
    .select(
      "id, version, status, summary, breaking, published_at, published_by, snapshots:release_token_snapshots(id)",
    )
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];
  const profilesById = await loadProfiles(
    supabase,
    rows.map((r) => r.published_by),
  );

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Releases" },
        ]}
        primaryAction={{ label: "Draft release", href: "/releases/new" }}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Flow
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Releases</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Immutable, versioned snapshots. Every export and integration reads
            from a release.
          </p>
        </div>

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Tag />
              </EmptyMedia>
              <EmptyTitle>No releases yet</EmptyTitle>
              <EmptyDescription>
                Once a change request is approved, draft a release to bundle
                approved changes into an immutable snapshot.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col">
            {rows.map((release, idx) => (
              <li
                key={release.id}
                className="border-border/60 flex gap-6 border-b py-6 last:border-b-0"
              >
                <div className="flex flex-col items-center">
                  <span className="bg-foreground/80 border-background size-2.5 rounded-full border-2" />
                  {idx < rows.length - 1 ? (
                    <span className="bg-border mt-1 w-px flex-1" />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/releases/${release.id}`}
                      className="hover:underline"
                    >
                      <span className="font-mono text-xl font-medium tracking-tight">
                        v{release.version}
                      </span>
                    </Link>
                    <Badge
                      variant={
                        release.status === "published"
                          ? "default"
                          : release.status === "draft"
                            ? "outline"
                            : "secondary"
                      }
                      className="font-normal capitalize"
                    >
                      {release.status}
                    </Badge>
                    {release.breaking ? (
                      <Badge variant="destructive" className="font-normal">
                        Breaking
                      </Badge>
                    ) : null}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {release.published_at
                        ? formatRelativeDate(release.published_at)
                        : "Not yet published"}
                    </span>
                  </div>
                  {release.summary ? (
                    <p className="text-sm">{release.summary}</p>
                  ) : null}
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 text-xs">
                    <span className="font-mono">
                      {release.snapshots.length} tokens
                    </span>
                    {release.published_by ? (
                      <span>
                        by {formatActorName(profilesById.get(release.published_by))}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/releases/${release.id}`}>
                        <Tag data-icon="inline-start" />
                        View release
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/api/exports/${release.id}/css`}>
                        Export CSS
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
