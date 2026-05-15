import { NextResponse } from "next/server";

import { authorize, err, ok, requireRole, requireScope } from "@/app/api/v1/_lib";
import { extractReferences } from "@/lib/core/references";
import { validateToken } from "@/lib/core/validation";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";
import type { TokenLevel, TokenStatus, TokenType } from "@/lib/supabase/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const scopeErr = requireScope(ctx, "tokens:read");
  if (scopeErr) return scopeErr;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const level = url.searchParams.get("level");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 100), 1),
    500,
  );
  const cursor = url.searchParams.get("cursor");

  let query = ctx.supabase
    .from("tokens")
    .select(
      "id, name, type, level, status, description, tags, current_value, current_resolved_value, deprecated, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })
    .limit(limit + 1);

  if (type) query = query.eq("type", type as TokenType);
  if (level) query = query.eq("level", level as TokenLevel);
  if (status) query = query.eq("status", status as TokenStatus);
  if (q) query = query.ilike("name", `%${q}%`);
  if (cursor) query = query.gt("name", cursor);

  const { data, error } = await query;
  if (error) return err(error.message, 500);

  const rows = data ?? [];
  const tokens = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const nextCursor = hasMore
    ? (tokens[tokens.length - 1] as { name: string }).name
    : null;

  return ok({ tokens, nextCursor });
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
    name?: string;
    type?: TokenType;
    level?: TokenLevel;
    value?: string;
    description?: string;
    tags?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body.", 400);
  }

  const name = (body.name ?? "").trim();
  const type = body.type;
  const level = body.level;
  const value = (body.value ?? "").trim();
  const description = body.description?.trim() || null;
  const tags = Array.isArray(body.tags)
    ? body.tags
        .map((t) => String(t).toLowerCase().trim())
        .filter(Boolean)
        .filter((t, i, a) => a.indexOf(t) === i)
    : [];

  if (!name || !type || !level || !value) {
    return err("name, type, level, and value are required.", 400);
  }

  const { data: existingRows } = await ctx.supabase
    .from("tokens")
    .select("name, current_value")
    .eq("workspace_id", workspaceId);
  const tokensByName = new Map<string, string>();
  const existingNames = new Set<string>();
  for (const row of (existingRows ?? []) as Array<{
    name: string;
    current_value: string | null;
  }>) {
    tokensByName.set(row.name, row.current_value ?? "");
    existingNames.add(row.name);
  }

  const schema = await loadSchemaConfig(ctx.supabase, workspaceId);
  const validation = validateToken({
    name,
    type,
    value,
    description: description ?? undefined,
    tokensByName,
    existingNames,
    schema,
  });
  if (!validation.valid) {
    return err("Validation failed.", 422, {
      issues: validation.issues
        .filter((i) => i.severity === "error")
        .map(({ code, message, path }) => ({ code, message, path })),
    });
  }

  const tokenStatus: TokenStatus = "draft";
  const { data: inserted, error: insErr } = await ctx.supabase
    .from("tokens")
    .insert({
      workspace_id: workspaceId,
      name,
      type,
      level,
      status: tokenStatus,
      description,
      tags,
      current_value: value,
      current_resolved_value: validation.resolvedValue ?? value,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as never)
    .select("id, name, type, level, status")
    .single();
  if (insErr || !inserted) return err(insErr?.message ?? "Insert failed.", 500);

  const tokenId = (inserted as { id: string }).id;

  await ctx.supabase.from("token_versions").insert({
    token_id: tokenId,
    workspace_id: workspaceId,
    value,
    resolved_value: validation.resolvedValue ?? value,
    created_by: ctx.userId,
  } as never);

  const refs = extractReferences(value);
  if (refs.length > 0) {
    const { data: refRows } = await ctx.supabase
      .from("tokens")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .in("name", refs);
    const insertRefs = ((refRows ?? []) as Array<{ id: string; name: string }>).map(
      (r) => ({
        workspace_id: workspaceId,
        source_token_id: tokenId,
        referenced_token_id: r.id,
      }),
    );
    if (insertRefs.length > 0) {
      await ctx.supabase.from("token_references").insert(insertRefs as never);
    }
  }

  await ctx.supabase.rpc("record_audit", {
    ws_id: workspaceId,
    p_action: "token.created",
    p_entity_type: "Token",
    p_entity_id: tokenId,
    p_after: { name, type, level, value, via: "api" },
  } as never);

  return ok(inserted, { status: 201 });
}
