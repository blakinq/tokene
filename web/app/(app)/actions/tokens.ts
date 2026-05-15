"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";
import { extractReferences } from "@/lib/core/references";
import { validateToken } from "@/lib/core/validation";
import type {
  TokenLevel,
  TokenStatus,
  TokenType,
} from "@/lib/supabase/types";

export type CreateTokenState =
  | { ok: true; tokenId: string }
  | { ok: false; error: string; issues?: { code: string; message: string; path?: string }[] }
  | null;

export async function createTokenAction(
  _prev: CreateTokenState,
  formData: FormData,
): Promise<CreateTokenState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as TokenType;
  const level = String(formData.get("level") ?? "") as TokenLevel;
  const value = String(formData.get("value") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: existing } = await supabase
    .from("tokens")
    .select("name, current_value")
    .eq("workspace_id", workspace.workspaceId);

  const existingRows = (existing ?? []) as Array<{
    name: string;
    current_value: string | null;
  }>;
  const tokensByName = new Map<string, string>();
  const existingNames = new Set<string>();
  for (const row of existingRows) {
    tokensByName.set(row.name, row.current_value ?? "");
    existingNames.add(row.name);
  }

  const schema = await loadSchemaConfig(supabase, workspace.workspaceId);
  const validation = validateToken({
    name,
    type,
    value,
    description: description || undefined,
    tokensByName,
    existingNames,
    schema,
  });

  if (!validation.valid) {
    return {
      ok: false,
      error: "Validation failed.",
      issues: validation.issues
        .filter((i) => i.severity === "error")
        .map(({ code, message, path }) => ({ code, message, path })),
    };
  }

  const status: TokenStatus = "draft";

  const { data: insertedToken, error: insertError } = await supabase
    .from("tokens")
    .insert({
      workspace_id: workspace.workspaceId,
      name,
      type,
      level,
      status,
      description: description || null,
      current_value: value,
      current_resolved_value: validation.resolvedValue ?? value,
      created_by: user.id,
      updated_by: user.id,
    } as never)
    .select("id")
    .single();

  if (insertError || !insertedToken) {
    return {
      ok: false,
      error: insertError?.message ?? "Failed to create token.",
    };
  }

  const tokenId = (insertedToken as { id: string }).id;

  // Persist initial version
  await supabase.from("token_versions").insert({
    token_id: tokenId,
    workspace_id: workspace.workspaceId,
    value,
    resolved_value: validation.resolvedValue ?? value,
    created_by: user.id,
  } as never);

  // Persist references
  const refs = extractReferences(value);
  if (refs.length > 0) {
    const { data: referencedRows } = await supabase
      .from("tokens")
      .select("id, name")
      .eq("workspace_id", workspace.workspaceId)
      .in("name", refs);

    const refRows = (referencedRows ?? []).map((r) => ({
      workspace_id: workspace.workspaceId,
      source_token_id: tokenId,
      referenced_token_id: (r as { id: string }).id,
    }));
    if (refRows.length > 0) {
      await supabase.from("token_references").insert(refRows as never);
    }
  }

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "token.created",
    p_entity_type: "Token",
    p_entity_id: tokenId,
    p_after: {
      name,
      type,
      level,
      value,
      resolved_value: validation.resolvedValue ?? value,
    },
  } as never);

  revalidatePath("/tokens");
  redirect(`/tokens/${tokenId}`);
}
