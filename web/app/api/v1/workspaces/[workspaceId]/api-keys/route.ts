import { NextResponse } from "next/server";

import { authorize, err, ok, requireRole } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const roleErr = await requireRole(ctx, "admin");
  if (roleErr) return roleErr;

  const { data, error } = await ctx.supabase
    .from("api_keys")
    .select("id, name, prefix, scopes, created_at, last_used_at, revoked_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) return err(error.message, 500);
  return ok({ api_keys: data ?? [] });
}
