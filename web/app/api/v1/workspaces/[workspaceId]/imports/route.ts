import { NextResponse } from "next/server";

import { authorize, err, ok } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50), 1),
    200,
  );

  const { data, error } = await ctx.supabase
    .from("import_jobs")
    .select(
      "id, status, source_filename, parsed_tokens, conflicts, change_request_id, created_by, created_at, committed_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return err(error.message, 500);
  return ok({ imports: data ?? [] });
}
