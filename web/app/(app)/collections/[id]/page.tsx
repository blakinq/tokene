import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Trash2, X } from "lucide-react";

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
import { Boxes } from "lucide-react";
import { ColorSwatch } from "@/components/color-swatch";
import { SiteHeader } from "@/components/site-header";
import { TokenStatusBadge } from "@/components/status-badge";
import { formatRelativeDate } from "@/lib/mock-data";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { TokenLevel, TokenStatus, TokenType } from "@/lib/supabase/types";
import {
  deleteCollection,
  removeTokenFromCollection,
} from "@/app/(app)/actions/collections";
import { AddTokenForm, type AddCandidate } from "./add-token-form";

type Detail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
  members: {
    position: number;
    token: {
      id: string;
      name: string;
      type: TokenType;
      level: TokenLevel;
      status: TokenStatus;
      current_resolved_value: string | null;
    } | null;
  }[];
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, name, slug, description, updated_at, " +
        "members:collection_tokens(position, token:token_id(id, name, type, level, status, current_resolved_value))",
    )
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const collection = data as unknown as Detail;
  const members = [...collection.members]
    .sort((a, b) => a.position - b.position)
    .map((m) => m.token)
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const memberIds = new Set(members.map((t) => t.id));

  const { data: allTokens } = await supabase
    .from("tokens")
    .select("id, name, type, level, status")
    .eq("workspace_id", workspace.workspaceId)
    .order("name", { ascending: true });

  const candidates = (
    ((allTokens ?? []) as unknown as AddCandidate[])
  ).filter((t) => !memberIds.has(t.id));

  const { data: latestReleaseRaw } = await supabase
    .from("releases")
    .select("id, version, published_at")
    .eq("workspace_id", workspace.workspaceId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestRelease = latestReleaseRaw as
    | { id: string; version: string; published_at: string | null }
    | null;

  const isAdmin = workspace.role === "admin";
  const exportFormats: { slug: string; label: string }[] = [
    { slug: "css", label: "CSS" },
    { slug: "scss", label: "SCSS" },
    { slug: "ts", label: "TypeScript" },
    { slug: "json", label: "JSON" },
    { slug: "style-dictionary", label: "Style Dictionary" },
  ];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Collections", href: "/collections" },
          { label: collection.name },
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
            <Link href="/collections">
              <ArrowLeft data-icon="inline-start" />
              All collections
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground font-mono text-xs">
                {collection.slug}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                {collection.name}
              </h1>
              {collection.description ? (
                <p className="text-muted-foreground max-w-2xl text-sm">
                  {collection.description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <AddTokenForm collectionId={collection.id} candidates={candidates} />
              {isAdmin ? (
                <form action={deleteCollection}>
                  <input
                    type="hidden"
                    name="collectionId"
                    value={collection.id}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Export
            </CardTitle>
            <CardDescription>
              {latestRelease ? (
                <>
                  Generates from{" "}
                  <Link
                    href={`/releases/${latestRelease.id}`}
                    className="font-mono hover:underline"
                  >
                    v{latestRelease.version}
                  </Link>
                  , filtered to this collection&apos;s tokens.
                </>
              ) : members.length === 0 ? (
                "Add tokens to this collection, then publish a release to enable exports."
              ) : (
                "Publish a release to enable exports."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {exportFormats.map((format) => (
              <Button
                key={format.slug}
                variant="outline"
                size="sm"
                asChild={Boolean(latestRelease && members.length > 0)}
                disabled={!latestRelease || members.length === 0}
              >
                {latestRelease && members.length > 0 ? (
                  <a
                    href={`/api/exports/collections/${collection.id}/${format.slug}`}
                    download
                  >
                    <Download data-icon="inline-start" />
                    {format.label}
                  </a>
                ) : (
                  <>
                    <Download data-icon="inline-start" />
                    {format.label}
                  </>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Tokens
              <span className="text-muted-foreground ml-2 font-mono text-sm">
                {members.length}
              </span>
            </CardTitle>
            <CardDescription>
              Adding or removing a token here doesn&apos;t change the token —
              only this grouping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Boxes />
                  </EmptyMedia>
                  <EmptyTitle>No tokens in this collection</EmptyTitle>
                  <EmptyDescription>
                    Use the “Add token” button above to start grouping tokens.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col">
                {members.map((t) => (
                  <li
                    key={t.id}
                    className="border-border/60 flex items-center gap-3 border-b py-2.5 last:border-b-0"
                  >
                    {t.type === "color" && t.current_resolved_value ? (
                      <ColorSwatch value={t.current_resolved_value} />
                    ) : (
                      <span className="bg-muted size-4 shrink-0 rounded-[3px]" />
                    )}
                    <Link
                      href={`/tokens/${t.id}`}
                      className="font-mono text-sm hover:underline"
                    >
                      {t.name}
                    </Link>
                    <Badge variant="outline" className="font-normal capitalize">
                      {t.level}
                    </Badge>
                    <TokenStatusBadge status={t.status} />
                    <span className="text-muted-foreground ml-auto font-mono text-xs">
                      {t.current_resolved_value ?? "—"}
                    </span>
                    <form action={removeTokenFromCollection}>
                      <input
                        type="hidden"
                        name="collectionId"
                        value={collection.id}
                      />
                      <input type="hidden" name="tokenId" value={t.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${t.name}`}
                      >
                        <X />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-xs">
          Last updated {formatRelativeDate(collection.updated_at)}
        </p>
      </div>
    </>
  );
}
