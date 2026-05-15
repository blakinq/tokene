import { NextResponse } from "next/server";

import { authorize, err, ok, requireRole } from "@/app/api/v1/_lib";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const { data: workspace } = await ctx.supabase
    .from("workspaces")
    .select("id, name, slug, product, created_at")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace) return err("Workspace not found.", 404);

  const schemaConfig = await loadSchemaConfig(ctx.supabase, workspaceId);
  return ok({ workspace, schemaConfig });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const roleErr = await requireRole(ctx, "admin");
  if (roleErr) return roleErr;

  let body: { name?: string; product?: string };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body.", 400);
  }
  if (!body.name) return err("name is required.", 400);

  const { data, error } = await ctx.supabase
    .from("workspaces")
    .update({ name: body.name, product: body.product ?? null } as never)
    .eq("id", workspaceId)
    .select("id, name, slug, product")
    .single();
  if (error || !data) return err(error?.message ?? "Update failed.", 500);
  return ok(data);
}
