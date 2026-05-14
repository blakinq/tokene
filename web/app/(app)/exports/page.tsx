import Link from "next/link";
import { Code2, Download, FileCode, FileJson, Palette, Tag } from "lucide-react";

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
import { SiteHeader } from "@/components/site-header";
import { formatRelativeDate } from "@/lib/mock-data";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

type ReleaseRow = {
  id: string;
  version: string;
  published_at: string | null;
  snapshots: { id: string }[];
};

const formats: {
  name: string;
  slug: string;
  icon: typeof Palette;
  description: string;
}[] = [
  {
    name: "CSS variables",
    slug: "css",
    icon: Palette,
    description: ":root tokens for direct browser use.",
  },
  {
    name: "SCSS variables",
    slug: "scss",
    icon: Palette,
    description: "$ variables for Sass pipelines.",
  },
  {
    name: "TypeScript",
    slug: "ts",
    icon: Code2,
    description: "Type-safe constants for design system packages.",
  },
  {
    name: "JSON",
    slug: "json",
    icon: FileJson,
    description: "Flat key/value map of every token.",
  },
  {
    name: "Style Dictionary",
    slug: "style-dictionary",
    icon: FileCode,
    description: "Nested format for multi-platform pipelines.",
  },
];

export default async function ExportsPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data: releaseData, error } = await supabase
    .from("releases")
    .select(
      "id, version, published_at, snapshots:release_token_snapshots(id)",
    )
    .eq("workspace_id", workspace.workspaceId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  const releases = (releaseData ?? []) as unknown as ReleaseRow[];
  const latest = releases[0];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Exports" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Data
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Exports</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Generate deterministic, implementation-ready token files from any
            published release. Output is identical across runs.
          </p>
        </div>

        {!latest ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Tag />
              </EmptyMedia>
              <EmptyTitle>No published releases yet</EmptyTitle>
              <EmptyDescription>
                Publish a release from an approved change request to enable
                exports.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Latest release
                </CardTitle>
                <CardDescription>
                  All formats below export from{" "}
                  <Link
                    href={`/releases/${latest.id}`}
                    className="font-mono hover:underline"
                  >
                    v{latest.version}
                  </Link>
                  {latest.published_at
                    ? ` · published ${formatRelativeDate(latest.published_at)}`
                    : null}
                  .
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {formats.map((format) => {
                const Icon = format.icon;
                return (
                  <Card key={format.slug}>
                    <CardHeader>
                      <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
                        <Icon className="size-4" />
                      </div>
                      <CardTitle className="mt-1 text-sm font-medium">
                        {format.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {format.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a
                          href={`/api/exports/${latest.id}/${format.slug}`}
                          download
                        >
                          <Download data-icon="inline-start" />
                          Download
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  All published releases
                </CardTitle>
                <CardDescription>
                  Each release is an immutable snapshot. Exports are always
                  reproducible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col">
                  {releases.map((release) => (
                    <li
                      key={release.id}
                      className="border-border/60 flex items-center gap-3 border-b py-3 last:border-b-0"
                    >
                      <Link
                        href={`/releases/${release.id}`}
                        className="font-mono text-sm hover:underline"
                      >
                        v{release.version}
                      </Link>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] font-normal"
                      >
                        {release.snapshots.length} tokens
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {release.published_at
                          ? formatRelativeDate(release.published_at)
                          : "—"}
                      </span>
                      <div className="ml-auto flex flex-wrap gap-1.5">
                        {formats.map((format) => (
                          <Button
                            key={format.slug}
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`/api/exports/${release.id}/${format.slug}`}
                              download
                            >
                              {format.slug.toUpperCase()}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
