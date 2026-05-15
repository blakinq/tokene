import { NextResponse } from "next/server";

import { authorize, err, ok, requireRole } from "@/app/api/v1/_lib";
import type { ChangeRequestStatus } from "@/lib/supabase/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 50), 1),
    200,
  );

  let query = ctx.supabase
    .from("change_requests")
    .select(
      "id, short_id, title, description, status, breaking, stale, stale_reason, migration_notes, author_id, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (status) query = query.eq("status", status as ChangeRequestStatus);

  const { data, error } = await query;
  if (error) return err(error.message, 500);
  return ok({ change_requests: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const roleErr = await requireRole(ctx, "contributor");
  if (roleErr) return roleErr;

  let body: {
    title?: string;
    description?: string;
    migrationNotes?: string;
    tokenIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body.", 400);
  }

  const title = (body.title ?? "").trim();
  if (!title) return err("title is required.", 400);

  // Defer to a minimal version of createBlankChangeRequest. We don't reuse the
  // server action directly because it expects a FormData and redirects.
  const { count } = await ctx.supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  const shortId = `CR-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: cr, error: crErr } = await ctx.supabase
    .from("change_requests")
    .insert({
      workspace_id: workspaceId,
      short_id: shortId,
      title,
      description: body.description ?? null,
      migration_notes: body.migrationNotes ?? null,
      status: "open",
      author_id: ctx.userId,
    } as never)
    .select("id, short_id, title, status")
    .single();
  if (crErr || !cr) return err(crErr?.message ?? "Failed to create CR.", 500);

  return ok(cr, { status: 201 });
}
