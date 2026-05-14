import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, GitBranch, Pencil } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ColorSwatch } from "@/components/color-swatch";
import { SiteHeader } from "@/components/site-header";
import { TokenStatusBadge } from "@/components/status-badge";
import { formatRelativeDate } from "@/lib/mock-data";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { proposeChangeForToken } from "./propose-action";

type TokenLike = {
  id: string;
  name: string;
  type: string;
  level: string;
  status:
    | "draft"
    | "in_review"
    | "approved"
    | "published"
    | "deprecated"
    | "archived";
  description: string | null;
  current_value: string | null;
  current_resolved_value: string | null;
  tags: string[];
  updated_at: string;
};

export default async function TokenDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data: token, error } = await supabase
    .from("tokens")
    .select(
      "id, name, type, level, status, description, current_value, current_resolved_value, tags, updated_at",
    )
    .eq("id", tokenId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!token) notFound();

  const t = token as TokenLike;

  const { data: referencesRaw } = await supabase
    .from("token_references")
    .select(
      "referenced_token_id, referenced:referenced_token_id(id, name, type, level, current_resolved_value)",
    )
    .eq("source_token_id", t.id);

  const { data: dependentsRaw } = await supabase
    .from("token_references")
    .select(
      "source_token_id, source:source_token_id(id, name, type, level, current_resolved_value)",
    )
    .eq("referenced_token_id", t.id);

  const references = ((referencesRaw ?? []) as Array<{
    referenced: {
      id: string;
      name: string;
      type: string;
      level: string;
      current_resolved_value: string | null;
    } | null;
  }>)
    .map((r) => r.referenced)
    .filter(
      (
        x,
      ): x is {
        id: string;
        name: string;
        type: string;
        level: string;
        current_resolved_value: string | null;
      } => Boolean(x),
    );

  const dependents = ((dependentsRaw ?? []) as Array<{
    source: {
      id: string;
      name: string;
      type: string;
      level: string;
      current_resolved_value: string | null;
    } | null;
  }>)
    .map((r) => r.source)
    .filter(
      (
        x,
      ): x is {
        id: string;
        name: string;
        type: string;
        level: string;
        current_resolved_value: string | null;
      } => Boolean(x),
    );

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Tokens", href: "/tokens" },
          { label: t.name },
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
            <Link href="/tokens">
              <ArrowLeft data-icon="inline-start" />
              All tokens
            </Link>
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-normal capitalize">
                  {t.level}
                </Badge>
                <TokenStatusBadge status={t.status} />
                <Badge variant="outline" className="font-normal capitalize">
                  {t.type.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="font-mono text-2xl tracking-tight md:text-3xl">
                {t.name}
              </h1>
              {t.description ? (
                <p className="text-muted-foreground max-w-2xl text-sm">
                  {t.description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Copy data-icon="inline-start" />
                Copy name
              </Button>
              <form action={proposeChangeForToken}>
                <input type="hidden" name="tokenId" value={t.id} />
                <input type="hidden" name="tokenName" value={t.name} />
                <Button type="submit" size="sm">
                  <Pencil data-icon="inline-start" />
                  Propose change
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Preview</CardTitle>
                <CardDescription>
                  How this token resolves in the current published release.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TokenPreview
                  type={t.type}
                  resolved={t.current_resolved_value ?? ""}
                />
              </CardContent>
            </Card>

            <Card>
              <Tabs defaultValue="references">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-base font-medium">Graph</CardTitle>
                  <TabsList>
                    <TabsTrigger value="references">
                      References
                      <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                        {references.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="dependents">
                      Dependents
                      <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                        {dependents.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="references" className="mt-0">
                    {references.length === 0 ? (
                      <p className="text-muted-foreground py-6 text-center text-sm">
                        This token has a literal value. It does not reference any
                        other tokens.
                      </p>
                    ) : (
                      <ul className="flex flex-col">
                        {references.map((ref) => (
                          <li
                            key={ref.id}
                            className="flex items-center gap-3 py-2"
                          >
                            <GitBranch className="text-muted-foreground size-4" />
                            <Link
                              href={`/tokens/${ref.id}`}
                              className="font-mono text-sm hover:underline"
                            >
                              {ref.name}
                            </Link>
                            <div className="ml-auto flex items-center gap-2">
                              {ref.type === "color" &&
                              ref.current_resolved_value ? (
                                <ColorSwatch
                                  value={ref.current_resolved_value}
                                />
                              ) : null}
                              <span className="text-muted-foreground font-mono text-xs">
                                {ref.current_resolved_value}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                  <TabsContent value="dependents" className="mt-0">
                    {dependents.length === 0 ? (
                      <p className="text-muted-foreground py-6 text-center text-sm">
                        No tokens depend on this one yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col">
                        {dependents.map((dep) => (
                          <li
                            key={dep.id}
                            className="flex items-center gap-3 py-2"
                          >
                            <GitBranch className="text-muted-foreground size-4 -scale-x-100" />
                            <Link
                              href={`/tokens/${dep.id}`}
                              className="font-mono text-sm hover:underline"
                            >
                              {dep.name}
                            </Link>
                            <Badge
                              variant="outline"
                              className="ml-auto font-normal capitalize"
                            >
                              {dep.level}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col">
                  <DetailRow label="Raw value">
                    <span className="font-mono text-sm">
                      {t.current_value ?? "—"}
                    </span>
                  </DetailRow>
                  <DetailRow label="Resolved">
                    <div className="flex items-center gap-2">
                      {t.type === "color" && t.current_resolved_value ? (
                        <ColorSwatch value={t.current_resolved_value} />
                      ) : null}
                      <span className="font-mono text-sm">
                        {t.current_resolved_value ?? "—"}
                      </span>
                    </div>
                  </DetailRow>
                  <DetailRow label="Type">
                    <span className="text-sm capitalize">
                      {t.type.replace("_", " ")}
                    </span>
                  </DetailRow>
                  <DetailRow label="Level">
                    <span className="text-sm capitalize">{t.level}</span>
                  </DetailRow>
                  <DetailRow label="Status">
                    <TokenStatusBadge status={t.status} />
                  </DetailRow>
                  <DetailRow label="Tags">
                    <div className="flex flex-wrap gap-1">
                      {t.tags.length === 0 ? (
                        <span className="text-muted-foreground text-xs">
                          —
                        </span>
                      ) : null}
                      {t.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </DetailRow>
                  <DetailRow label="Dependents">
                    <span className="font-mono text-sm">
                      {dependents.length}
                    </span>
                  </DetailRow>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Last update
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">·</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">System</span>
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeDate(t.updated_at)}
                    </span>
                  </div>
                </div>
                <Separator />
                <Button variant="outline" size="sm" asChild>
                  <Link href="/releases">View releases</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border/60 grid grid-cols-3 items-center gap-3 border-b py-2.5 last:border-b-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

function TokenPreview({
  type,
  resolved,
}: {
  type: string;
  resolved: string;
}) {
  if (!resolved) {
    return (
      <div className="bg-muted/40 flex h-32 items-center justify-center rounded-md">
        <span className="text-muted-foreground text-sm">No value yet</span>
      </div>
    );
  }
  if (type === "color") {
    return (
      <div className="flex flex-col gap-3">
        <div
          className="border-border h-32 w-full rounded-md border"
          style={{ backgroundColor: resolved }}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Resolved</span>
          <span className="font-mono">{resolved}</span>
        </div>
      </div>
    );
  }
  if (type === "spacing" || type === "sizing") {
    return (
      <div className="bg-muted/40 flex h-32 items-center justify-center rounded-md">
        <div
          className="bg-foreground rounded-sm"
          style={{ width: resolved, height: resolved }}
        />
      </div>
    );
  }
  if (type === "radius") {
    return (
      <div className="bg-muted/40 flex h-32 items-center justify-center rounded-md">
        <div className="bg-foreground size-20" style={{ borderRadius: resolved }} />
      </div>
    );
  }
  if (type === "shadow") {
    return (
      <div className="bg-muted/40 flex h-32 items-center justify-center rounded-md">
        <div
          className="bg-background size-20 rounded-md"
          style={{ boxShadow: resolved }}
        />
      </div>
    );
  }
  return (
    <div className="bg-muted/40 flex h-32 items-center justify-center rounded-md">
      <span className="font-mono text-sm">{resolved}</span>
    </div>
  );
}
