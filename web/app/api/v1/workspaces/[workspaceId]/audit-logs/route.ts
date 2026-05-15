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
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entity_type");
  const actor = url.searchParams.get("actor");
  const since = url.searchParams.get("since");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 100), 1),
    500,
  );

  let query = ctx.supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, actor_id, before_value, after_value, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);
  if (actor) query = query.eq("actor_id", actor);
  if (since) query = query.gte("created_at", since);

  const { data, error } = await query;
  if (error) return err(error.message, 500);
  return ok({ entries: data ?? [] });
}
