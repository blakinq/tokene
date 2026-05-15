import { NextResponse } from "next/server";

import { authorize, err, ok, requireScope } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; releaseId: string }> },
) {
  const { workspaceId, releaseId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const scopeErr = requireScope(ctx, "changelog:read");
  if (scopeErr) return scopeErr;

  const { data: release } = await ctx.supabase
    .from("releases")
    .select("id, version, summary, breaking, published_at")
    .eq("id", releaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!release) return err("Release not found.", 404);

  // CRs included in this release.
  const { data: crLinks } = await ctx.supabase
    .from("release_change_requests")
    .select(
      "change_request:change_request_id(id, short_id, title, description, breaking, migration_notes)",
    )
    .eq("release_id", releaseId)
    .eq("workspace_id", workspaceId);

  // Items across those CRs so the changelog can spell out the actual edits.
  const crIds = ((crLinks ?? []) as Array<{
    change_request: { id: string } | null;
  }>)
    .map((l) => l.change_request?.id)
    .filter((x): x is string => Boolean(x));

  let items: unknown[] = [];
  if (crIds.length > 0) {
    const { data: itemRows } = await ctx.supabase
      .from("change_request_items")
      .select("change_request_id, kind, token_name, token_type, before_value, after_value")
      .in("change_request_id", crIds)
      .eq("workspace_id", workspaceId);
    items = itemRows ?? [];
  }

  return ok({ release, change_requests: crLinks ?? [], items });
}
