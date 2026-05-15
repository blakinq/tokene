"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { ApiKeyScope } from "@/lib/supabase/types";

const ALL_SCOPES: ApiKeyScope[] = [
  "tokens:read",
  "releases:read",
  "exports:create",
  "changelog:read",
];

export type CreateApiKeyState =
  | { ok: true; plaintext: string; prefix: string; name: string }
  | { ok: false; error: string }
  | null;

function generateKey(): { plaintext: string; prefix: string; hash: string } {
  // 32 bytes = 256 bits of entropy → 43-char base64url segment.
  const random = randomBytes(32).toString("base64url");
  const plaintext = `tke_${random}`;
  const prefix = plaintext.slice(0, 11);
  const hash = createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, prefix, hash };
}

export async function createApiKeyAction(
  _prev: CreateApiKeyState,
  formData: FormData,
): Promise<CreateApiKeyState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };

  const requested = formData.getAll("scopes").map((s) => String(s));
  const scopes = ALL_SCOPES.filter((s) => requested.includes(s));
  if (scopes.length === 0) {
    return { ok: false, error: "Pick at least one scope." };
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    return { ok: false, error: "Only admins can create API keys." };
  }

  const { plaintext, prefix, hash } = generateKey();

  const { error } = await supabase.from("api_keys").insert({
    workspace_id: workspace.workspaceId,
    name,
    prefix,
    token_hash: hash,
    scopes,
    created_by: user.id,
  } as never);

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "api_key.created",
    p_entity_type: "ApiKey",
    p_entity_id: prefix,
    p_after: { name, scopes },
  } as never);

  revalidatePath("/settings");
  return { ok: true, plaintext, prefix, name };
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    throw new Error("Only admins can revoke API keys.");
  }

  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", id)
    .eq("workspace_id", workspace.workspaceId)
    .is("revoked_at", null);

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "api_key.revoked",
    p_entity_type: "ApiKey",
    p_entity_id: id,
  } as never);

  revalidatePath("/settings");
}
