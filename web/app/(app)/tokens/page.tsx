import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { TokensTable, type TokenRow } from "@/components/tokens-table";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { TokenStatus } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; q?: string }>;
}) {
  const { cursor, q } = await searchParams;
  const search = (q ?? "").trim();
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  // Workspace-wide stats stay accurate across pages.
  const statusFor = async (status: TokenStatus) => {
    const { count } = await supabase
      .from("tokens")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.workspaceId)
      .eq("status", status);
    return count ?? 0;
  };
  const totalQuery = supabase
    .from("tokens")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.workspaceId);

  const [{ count: total }, publishedCount, inReviewCount, deprecatedCount] =
    await Promise.all([
      totalQuery,
      statusFor("published"),
      statusFor("in_review"),
      statusFor("deprecated"),
    ]);

  // §29.2: cursor pagination by name. Fetch one extra row to detect `hasMore`.
  // §17: when `q` is present we use the trigram-backed `tokens_name_trgm_idx`
  // via ilike; pagination is still cursor-by-name so the extra row trick works.
  let query = supabase
    .from("tokens")
    .select(
      "id, name, type, level, status, current_value, current_resolved_value, deprecated, tags, updated_at",
    )
    .eq("workspace_id", workspace.workspaceId)
    .order("name", { ascending: true })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.gt("name", cursor);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load tokens: ${error.message}`);

  const fetched = (data ?? []) as TokenRow[];
  const tokens = fetched.slice(0, PAGE_SIZE);
  const hasMore = fetched.length > PAGE_SIZE;
  const nextCursor = hasMore ? tokens[tokens.length - 1]?.name : null;

  const stats = [
    { label: "Tokens", value: total ?? 0 },
    { label: "Published", value: publishedCount },
    { label: "In review", value: inReviewCount },
    { label: "Deprecated", value: deprecatedCount },
  ];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Tokens" },
        ]}
        primaryAction={{ label: "New token", href: "/tokens/new" }}
      />

      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Library
            </span>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight">Tokens</h1>
              <div className="flex items-center gap-2">
                <form
                  method="GET"
                  className="relative flex items-center"
                >
                  <Search className="text-muted-foreground absolute left-2.5 size-3.5" />
                  <Input
                    name="q"
                    placeholder="Search tokens by name"
                    defaultValue={search}
                    className="h-9 w-64 pl-8 font-mono text-xs"
                  />
                </form>
                <Button variant="outline" size="sm">
                  <Filter data-icon="inline-start" />
                  Saved views
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl text-sm">
              The source of truth for design decisions. Every change flows
              through review and release before reaching production exports.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card flex flex-col gap-1 p-4">
                <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                <dd className="font-mono text-2xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <TokensTable
          tokens={tokens}
          totalCount={total ?? 0}
          nextCursor={nextCursor}
          currentCursor={cursor ?? null}
        />
      </div>
    </>
  );
}
