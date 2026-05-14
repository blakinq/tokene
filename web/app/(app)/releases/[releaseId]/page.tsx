import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ColorSwatch } from "@/components/color-swatch";
import { SiteHeader } from "@/components/site-header";
import { formatRelativeDate } from "@/lib/mock-data";
import { formatActorName, loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type {
  ReleaseStatus,
  TokenLevel,
  TokenType,
} from "@/lib/supabase/types";

type ReleaseRow = {
  id: string;
  version: string;
  status: ReleaseStatus;
  summary: string | null;
  breaking: boolean;
  published_at: string | null;
  published_by: string | null;
  snapshots: {
    id: string;
    name: string;
    type: TokenType;
    level: TokenLevel;
    value: string;
    resolved_value: string;
  }[];
  change_requests: {
    change_request: {
      id: string;
      short_id: string;
      title: string;
    } | null;
  }[];
};

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ releaseId: string }>;
}) {
  const { releaseId } = await params;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("releases")
    .select(
      "id, version, status, summary, breaking, published_at, published_by, " +
        "snapshots:release_token_snapshots(id, name, type, level, value, resolved_value), " +
        "change_requests:release_change_requests(change_request:change_request_id(id, short_id, title))",
    )
    .eq("id", releaseId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const release = data as unknown as ReleaseRow;
  const profilesById = await loadProfiles(supabase, [release.published_by]);
  const publishedByName = release.published_by
    ? formatActorName(profilesById.get(release.published_by), "—")
    : "—";

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Releases", href: "/releases" },
          { label: `v${release.version}` },
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
            <Link href="/releases">
              <ArrowLeft data-icon="inline-start" />
              All releases
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    release.status === "published" ? "default" : "outline"
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
              </div>
              <h1 className="font-mono text-3xl font-medium tracking-tight">
                v{release.version}
              </h1>
              {release.summary ? (
                <p className="text-muted-foreground max-w-2xl text-sm">
                  {release.summary}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" asChild>
                <a href={`/api/exports/${release.id}/css`}>
                  <Download data-icon="inline-start" />
                  Export CSS
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Changelog
                </CardTitle>
                <CardDescription>
                  Approved change requests included in this release.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {release.change_requests.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No linked change requests.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {release.change_requests.map((link, i) =>
                      link.change_request ? (
                        <li
                          key={link.change_request.id}
                          className="border-border/60 flex items-center gap-3 border-b py-2.5 last:border-b-0"
                        >
                          <span className="text-muted-foreground font-mono text-xs">
                            {link.change_request.short_id}
                          </span>
                          <Link
                            href={`/change-requests/${link.change_request.id}`}
                            className="text-sm hover:underline"
                          >
                            {link.change_request.title}
                          </Link>
                        </li>
                      ) : null,
                    )}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Snapshot
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {release.snapshots.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Immutable copy of every token in this release.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col">
                  {release.snapshots.map((snap) => (
                    <li
                      key={snap.id}
                      className="border-border/60 flex items-center gap-3 border-b py-2 last:border-b-0"
                    >
                      {snap.type === "color" ? (
                        <ColorSwatch value={snap.resolved_value} />
                      ) : (
                        <span className="bg-muted size-4 shrink-0 rounded-[3px]" />
                      )}
                      <span className="font-mono text-sm">{snap.name}</span>
                      <span className="text-muted-foreground ml-auto font-mono text-xs">
                        {snap.resolved_value}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col">
                  {[
                    {
                      label: "Tokens",
                      value: release.snapshots.length.toString(),
                    },
                    {
                      label: "Change requests",
                      value: release.change_requests.length.toString(),
                    },
                    {
                      label: "Published",
                      value: release.published_at
                        ? formatRelativeDate(release.published_at)
                        : "—",
                    },
                    { label: "Published by", value: publishedByName },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="border-border/60 grid grid-cols-3 items-center gap-3 border-b py-2.5 last:border-b-0"
                    >
                      <dt className="text-muted-foreground text-xs">
                        {item.label}
                      </dt>
                      <dd className="col-span-2 text-sm">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Export presets
                </CardTitle>
                <CardDescription>
                  Deterministic outputs from this snapshot.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {[
                  { slug: "css", label: "CSS variables" },
                  { slug: "scss", label: "SCSS variables" },
                  { slug: "ts", label: "TypeScript" },
                  { slug: "json", label: "JSON" },
                  { slug: "style-dictionary", label: "Style Dictionary" },
                ].map((format) => (
                  <Button
                    key={format.slug}
                    variant="outline"
                    size="sm"
                    asChild
                    className="justify-between"
                  >
                    <a
                      href={`/api/exports/${release.id}/${format.slug}`}
                      download
                    >
                      {format.label}
                      <Download />
                    </a>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
