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
    .from("token_references")
    .select(
      "id, source_token_id, source:source_token_id(id, name, type, level, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("referenced_token_id", tokenId);
  if (error) return err(error.message, 500);
  return ok({ dependents: data ?? [] });
}
