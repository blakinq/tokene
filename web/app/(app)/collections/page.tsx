import Link from "next/link";
import { Boxes } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { formatRelativeDate } from "@/lib/mock-data";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
  tokens: { token_id: string }[];
};

export default async function CollectionsPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, name, slug, description, updated_at, tokens:collection_tokens(token_id)",
    )
    .eq("workspace_id", workspace.workspaceId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Collections" },
        ]}
        primaryAction={
          rows.length > 0
            ? { label: "New collection", href: "/collections/new" }
            : undefined
        }
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Library
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Group related tokens — by theme, surface, or product — for review
            and export.
          </p>
        </div>

        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Boxes />
              </EmptyMedia>
              <EmptyTitle>No collections yet</EmptyTitle>
              <EmptyDescription>
                Bundle tokens together for a specific brand, surface, or
                platform.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/collections/new">Create collection</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/collections/${c.id}`} className="block">
                  <Card className="hover:border-foreground/30 h-full transition-colors">
                    <CardContent className="flex flex-col gap-3">
                      <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
                        <Boxes className="size-4" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-base font-medium">{c.name}</span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {c.slug}
                        </span>
                      </div>
                      {c.description ? (
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                          {c.description}
                        </p>
                      ) : null}
                      <div className="text-muted-foreground mt-auto flex items-center gap-3 text-xs">
                        <span className="font-mono">
                          {c.tokens.length}{" "}
                          {c.tokens.length === 1 ? "token" : "tokens"}
                        </span>
                        <span>· Updated {formatRelativeDate(c.updated_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
