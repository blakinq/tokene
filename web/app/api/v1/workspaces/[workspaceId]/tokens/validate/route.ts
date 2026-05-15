import { NextResponse } from "next/server";

import { authorize, err, ok, requireScope } from "@/app/api/v1/_lib";
import { validateToken } from "@/lib/core/validation";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";
import type { TokenType } from "@/lib/supabase/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;
  const scopeErr = requireScope(ctx, "tokens:read");
  if (scopeErr) return scopeErr;

  let body: {
    name?: string;
    type?: TokenType;
    value?: string;
    description?: string;
  };
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body.", 400);
  }
  if (!body.name || !body.type || !body.value) {
    return err("name, type, and value are required.", 400);
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
  const result = validateToken({
    name: body.name,
    type: body.type,
    value: body.value,
    description: body.description,
    tokensByName,
    existingNames,
    schema,
  });

  return ok(result);
}
