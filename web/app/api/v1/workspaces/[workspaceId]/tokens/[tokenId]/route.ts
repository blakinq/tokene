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
    .from("tokens")
    .select(
      "id, name, type, level, status, description, tags, current_value, current_resolved_value, deprecated, replacement_token_id, created_at, updated_at",
    )
    .eq("id", tokenId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) return err(error.message, 500);
  if (!data) return err("Token not found.", 404);
  return ok(data);
}
