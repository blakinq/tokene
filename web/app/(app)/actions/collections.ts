"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CreateCollectionState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

export async function createCollectionAction(
  _prev: CreateCollectionState,
  formData: FormData,
): Promise<CreateCollectionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tokenIds = formData.getAll("tokenIds").map((x) => String(x));

  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(name);
  if (!slug) {
    return {
      ok: false,
      error: "Name must include letters or numbers to form a slug.",
    };
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: dupe } = await supabase
    .from("collections")
    .select("id")
    .eq("workspace_id", workspace.workspaceId)
    .eq("slug", slug)
    .maybeSingle();
  if (dupe) {
    return {
      ok: false,
      error: `Another collection already uses the slug "${slug}".`,
    };
  }

  const { data: inserted, error } = await supabase
    .from("collections")
    .insert({
      workspace_id: workspace.workspaceId,
      name,
      slug,
      description: description || null,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Failed to create collection." };
  }
  const collectionId = (inserted as { id: string }).id;

  if (tokenIds.length > 0) {
    const rows = tokenIds.map((id, i) => ({
      collection_id: collectionId,
      workspace_id: workspace.workspaceId,
      token_id: id,
      position: i,
      added_by: user.id,
    }));
    await supabase.from("collection_tokens").insert(rows as never);
  }

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "collection.created",
    p_entity_type: "Collection",
    p_entity_id: collectionId,
    p_after: { name, slug, count: tokenIds.length },
  } as never);

  revalidatePath("/collections");
  redirect(`/collections/${collectionId}`);
}

export async function addTokenToCollection(formData: FormData) {
  const collectionId = String(formData.get("collectionId"));
  const tokenId = String(formData.get("tokenId"));
  if (!collectionId || !tokenId) return;

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { count } = await supabase
    .from("collection_tokens")
    .select("*", { count: "exact", head: true })
    .eq("collection_id", collectionId)
    .eq("workspace_id", workspace.workspaceId);

  await supabase.from("collection_tokens").insert({
    collection_id: collectionId,
    token_id: tokenId,
    workspace_id: workspace.workspaceId,
    position: count ?? 0,
    added_by: user.id,
  } as never);

  revalidatePath(`/collections/${collectionId}`);
}

export async function removeTokenFromCollection(formData: FormData) {
  const collectionId = String(formData.get("collectionId"));
  const tokenId = String(formData.get("tokenId"));
  if (!collectionId || !tokenId) return;

  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  await supabase
    .from("collection_tokens")
    .delete()
    .eq("collection_id", collectionId)
    .eq("token_id", tokenId)
    .eq("workspace_id", workspace.workspaceId);

  revalidatePath(`/collections/${collectionId}`);
}

export async function deleteCollection(formData: FormData) {
  const collectionId = String(formData.get("collectionId"));
  if (!collectionId) return;

  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  if (workspace.role !== "admin") {
    throw new Error("Only admins can delete collections.");
  }

  await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("workspace_id", workspace.workspaceId);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "collection.deleted",
    p_entity_type: "Collection",
    p_entity_id: collectionId,
  } as never);

  revalidatePath("/collections");
  redirect("/collections");
}
