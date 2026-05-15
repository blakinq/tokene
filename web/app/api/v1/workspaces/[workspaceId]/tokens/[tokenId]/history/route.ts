import { NextResponse } from "next/server";

import { authorize, err, ok, requireScope } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; tokenId: string }> },
) {
  const { workspaceId, tokenId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const scopeErr = requireScope(ctx, "tokens:read");
  if (scopeErr) return scopeErr;

  const { data, error } = await ctx.supabase
    .from("token_versions")
    .select("id, value, resolved_value, metadata, release_id, change_request_id, created_at, created_by")
    .eq("workspace_id", workspaceId)
    .eq("token_id", tokenId)
    .order("created_at", { ascending: false });
  if (error) return err(error.message, 500);
  return ok({ versions: data ?? [] });
}
