import { NextResponse } from "next/server";

import { authorize, err, ok } from "@/app/api/v1/_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const ctx = await authorize(request, workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) return err(error.message, 500);

  const members = (data ?? []) as Array<{ user_id: string; role: string; created_at: string }>;
  const ids = members.map((m) => m.user_id);
  let profilesById = new Map<
    string,
    { display_name: string | null; email: string }
  >();
  if (ids.length > 0) {
    const { data: profileRows } = await ctx.supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", ids);
    profilesById = new Map(
      ((profileRows ?? []) as Array<{
        id: string;
        display_name: string | null;
        email: string;
      }>).map((p) => [p.id, { display_name: p.display_name, email: p.email }]),
    );
  }

  return ok({
    members: members.map((m) => ({
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      profile: profilesById.get(m.user_id) ?? null,
    })),
  });
}
