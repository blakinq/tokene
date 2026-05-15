import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ApiKeyScope } from "@/lib/supabase/types";

export type ApiKeyAuth = {
  apiKeyId: string;
  workspaceId: string;
  scopes: ApiKeyScope[];
};

/**
 * Look up an `Authorization: Bearer <plaintext>` header against `api_keys`.
 *
 * Returns null if absent / malformed / unknown / revoked. Uses the service
 * client because RLS on `api_keys` requires admin context that an unauthed
 * caller doesn't have. Touches `last_used_at` on success.
 */
export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyAuth | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const plaintext = match[1];
  if (!plaintext.startsWith("tke_")) return null;

  const hash = createHash("sha256").update(plaintext).digest("hex");

  const service = createSupabaseServiceClient();
  const { data } = await service.rpc("api_key_resolve" as never, {
    p_hash: hash,
  } as never);

  const rows = (data ?? []) as Array<{
    api_key_id: string;
    workspace_id: string;
    scopes: ApiKeyScope[];
  }>;
  const row = rows[0];
  if (!row) return null;

  // Touch last_used_at, fire-and-forget.
  await service
    .rpc("api_key_touch" as never, { p_id: row.api_key_id } as never)
    .then(() => undefined, () => undefined);

  return {
    apiKeyId: row.api_key_id,
    workspaceId: row.workspace_id,
    scopes: row.scopes,
  };
}

export function hasScope(auth: ApiKeyAuth, scope: ApiKeyScope): boolean {
  return auth.scopes.includes(scope);
}
