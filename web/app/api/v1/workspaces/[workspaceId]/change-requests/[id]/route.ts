import { NextResponse } from "next/server";

import { authorize, err, ok } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; id: string }> },
) {
  const { workspaceId, id } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("change_requests")
    .select(
      "id, short_id, title, description, status, breaking, stale, stale_reason, migration_notes, author_id, created_at, updated_at, " +
        "items:change_request_items(id, kind, token_name, token_type, before_value, after_value, note, position), " +
        "reviews(id, decision, reviewer_id, comment, created_at)",
    )
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) return err(error.message, 500);
  if (!data) return err("Change request not found.", 404);
  return ok(data);
}
