import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { TokensTable, type TokenRow } from "@/components/tokens-table";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { TokenLevel, TokenStatus, TokenType } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

const TYPE_VALUES: TokenType[] = [
  "color",
  "spacing",
  "sizing",
  "radius",
  "border_width",
  "typography",
  "shadow",
  "opacity",
  "z_index",
  "duration",
  "easing",
];
const LEVEL_VALUES: TokenLevel[] = ["primitive", "semantic", "component"];
const STATUS_VALUES: TokenStatus[] = [
  "draft",
  "in_review",
  "approved",
  "published",
  "deprecated",
  "archived",
];

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    q?: string;
    type?: string;
    level?: string;
    status?: string;
    tag?: string;
  }>;
}) {
  const params = await searchParams;
  const { cursor } = params;
  const search = (params.q ?? "").trim();
  const typeFilter = TYPE_VALUES.includes(params.type as TokenType)
    ? (params.type as TokenType)
    : null;
  const levelFilter = LEVEL_VALUES.includes(params.level as TokenLevel)
    ? (params.level as TokenLevel)
    : null;
  const statusFilter = STATUS_VALUES.includes(params.status as TokenStatus)
    ? (params.status as TokenStatus)
    : null;
  const tagFilter = (params.tag ?? "").trim().toLowerCase() || null;
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
  if (typeFilter) query = query.eq("type", typeFilter);
  if (levelFilter) query = query.eq("level", levelFilter);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (tagFilter) query = query.contains("tags", [tagFilter]);

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
              <form
                method="GET"
                className="flex flex-wrap items-center gap-2"
              >
                <div className="relative flex items-center">
                  <Search className="text-muted-foreground absolute left-2.5 size-3.5" />
                  <Input
                    name="q"
                    placeholder="Search by name"
                    defaultValue={search}
                    className="h-9 w-56 pl-8 font-mono text-xs"
                  />
                </div>
                <select
                  name="type"
                  defaultValue={typeFilter ?? ""}
                  className="bg-background h-9 rounded-md border px-2 text-xs"
                >
                  <option value="">Any type</option>
                  {TYPE_VALUES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  name="level"
                  defaultValue={levelFilter ?? ""}
                  className="bg-background h-9 rounded-md border px-2 text-xs"
                >
                  <option value="">Any level</option>
                  {LEVEL_VALUES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={statusFilter ?? ""}
                  className="bg-background h-9 rounded-md border px-2 text-xs"
                >
                  <option value="">Any status</option>
                  {STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <Input
                  name="tag"
                  placeholder="tag"
                  defaultValue={tagFilter ?? ""}
                  className="h-9 w-24 font-mono text-xs"
                />
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 text-xs font-medium"
                >
                  Apply
                </button>
              </form>
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
