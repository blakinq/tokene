import { NextResponse } from "next/server";

import { authorize, err, ok, requireScope } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; releaseId: string }> },
) {
  const { workspaceId, releaseId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const scopeErr = requireScope(ctx, "releases:read");
  if (scopeErr) return scopeErr;

  const { data, error } = await ctx.supabase
    .from("releases")
    .select(
      "id, version, status, summary, breaking, published_at, published_by, created_at, " +
        "snapshots:release_token_snapshots(id, name, type, level, value, resolved_value, description, tags, deprecated), " +
        "change_requests:release_change_requests(change_request:change_request_id(id, short_id, title))",
    )
    .eq("id", releaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) return err(error.message, 500);
  if (!data) return err("Release not found.", 404);
  return ok(data);
}
