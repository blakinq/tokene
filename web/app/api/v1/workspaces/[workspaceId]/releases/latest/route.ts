import { NextResponse } from "next/server";

import { authorize, err, ok, requireScope } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const scopeErr = requireScope(ctx, "releases:read");
  if (scopeErr) return scopeErr;

  const { data, error } = await ctx.supabase
    .from("releases")
    .select(
      "id, version, status, summary, breaking, published_at, published_by, created_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return err(error.message, 500);
  if (!data) return err("No published release.", 404);
  return ok(data);
}
