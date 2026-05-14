"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserOrRedirect } from "@/lib/supabase/queries";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CreateWorkspaceState =
  | { ok: true; workspaceId: string }
  | { ok: false; error: string }
  | null;

export async function createWorkspaceAction(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const name = String(formData.get("name") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();

  if (!name) return { ok: false, error: "Workspace name is required." };

  const baseSlug = slugify(name);
  if (!baseSlug) {
    return {
      ok: false,
      error: "Name must include letters or numbers to form a slug.",
    };
  }

  const { supabase, user } = await getCurrentUserOrRedirect();

  // Resolve a unique slug by appending a numeric suffix when needed.
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: inserted, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      slug,
      product: product || null,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (error || !inserted) {
    return {
      ok: false,
      error: error?.message ?? "Failed to create workspace.",
    };
  }
  const workspaceId = (inserted as { id: string }).id;

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: "admin",
    } as never);

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  await supabase.rpc("record_audit", {
    ws_id: workspaceId,
    p_action: "workspace.created",
    p_entity_type: "Workspace",
    p_entity_id: workspaceId,
    p_after: { name, slug, product },
  } as never);

  revalidatePath("/", "layout");
  redirect("/tokens");
}
