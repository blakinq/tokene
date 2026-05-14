import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/lib/supabase/types";

export type WorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  workspaceProduct: string | null;
  role: WorkspaceRole;
};

export async function getCurrentUserOrRedirect() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getCurrentWorkspaceOrRedirect(): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: NonNullable<
    Awaited<
      ReturnType<
        Awaited<ReturnType<typeof createSupabaseServerClient>>["auth"]["getUser"]
      >
    >["data"]["user"]
  >;
  workspace: WorkspaceContext;
}> {
  const { supabase, user } = await getCurrentUserOrRedirect();

  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces:workspaces(id, name, product)")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load workspace membership: ${error.message}`);
  }

  const membership = memberships?.[0] as
    | {
        role: WorkspaceRole;
        workspaces: { id: string; name: string; product: string | null } | null;
      }
    | undefined;

  if (!membership?.workspaces) {
    redirect("/onboarding");
  }

  return {
    supabase,
    user,
    workspace: {
      workspaceId: membership.workspaces.id,
      workspaceName: membership.workspaces.name,
      workspaceProduct: membership.workspaces.product,
      role: membership.role,
    },
  };
}
