import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/supabase/api-key";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ApiKeyScope } from "@/lib/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ApiContext = {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string | null;
  apiKeyId: string | null;
  apiKeyScopes: ApiKeyScope[] | null;
  isApiKey: boolean;
};

/**
 * Authenticate the caller and confirm they belong to / hold a key for the
 * workspace named in the route. Returns a NextResponse on failure.
 */
export async function authorize(
  request: Request,
  workspaceId: string,
): Promise<ApiContext | NextResponse> {
  const key = await authenticateApiKey(request);
  if (key) {
    if (key.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "API key doesn't belong to this workspace." },
        { status: 403 },
      );
    }
    // API-key callers use the service client (no auth.uid() for RLS). Every
    // downstream query MUST filter by workspace_id explicitly.
    const service = createSupabaseServiceClient();
    return {
      supabase: service as unknown as SupabaseClient,
      workspaceId,
      userId: null,
      apiKeyId: key.apiKeyId,
      apiKeyScopes: key.scopes,
      isApiKey: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userResp } = await supabase.auth.getUser();
  if (!userResp?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userResp.user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json(
      { error: "You don't have access to this workspace." },
      { status: 403 },
    );
  }
  return {
    supabase,
    workspaceId,
    userId: userResp.user.id,
    apiKeyId: null,
    apiKeyScopes: null,
    isApiKey: false,
  };
}

export function requireScope(
  ctx: ApiContext,
  scope: ApiKeyScope,
): NextResponse | null {
  if (!ctx.isApiKey) return null;
  if (!ctx.apiKeyScopes || !ctx.apiKeyScopes.includes(scope)) {
    return NextResponse.json(
      { error: `API key is missing the ${scope} scope.` },
      { status: 403 },
    );
  }
  return null;
}

export async function requireRole(
  ctx: ApiContext,
  role: "viewer" | "contributor" | "reviewer" | "admin",
): Promise<NextResponse | null> {
  // API key auth has no role concept beyond scopes — block writes through it.
  if (ctx.isApiKey) {
    if (role !== "viewer") {
      return NextResponse.json(
        { error: "API keys can't perform this action." },
        { status: 403 },
      );
    }
    return null;
  }
  const { data } = await ctx.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", ctx.userId!)
    .maybeSingle();
  const userRole = (data as { role: string } | null)?.role;
  const order = ["viewer", "contributor", "reviewer", "admin"];
  if (!userRole || order.indexOf(userRole) < order.indexOf(role)) {
    return NextResponse.json(
      { error: `Requires ${role} role.` },
      { status: 403 },
    );
  }
  return null;
}

export function ok<T>(body: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(body as object, init);
}

export function err(
  message: string,
  status: number,
  extras?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extras }, { status });
}
