import { NextResponse } from "next/server";

import { authenticateApiKey, hasScope } from "@/lib/supabase/api-key";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { TokenType } from "@/lib/supabase/types";
import type { SnapshotForExport } from "@/lib/core/exporters/css";

export type ExportPayload = {
  release: { id: string; version: string; status: string };
  snapshots: SnapshotForExport[];
  workspaceId: string;
  userId: string | null;
  apiKeyId: string | null;
};

/**
 * Resolve a (workspace, snapshots) pair from either:
 *   - a session cookie (browser flow), via the user-scoped client + RLS, or
 *   - an `Authorization: Bearer tke_…` header (CI / SDK flow), via the service
 *     client, gated by the `exports:create` scope.
 */
export async function loadExportPayload(
  releaseId: string,
  request?: Request,
): Promise<ExportPayload | NextResponse> {
  const apiKey = request ? await authenticateApiKey(request) : null;

  if (apiKey) {
    if (!hasScope(apiKey, "exports:create")) {
      return NextResponse.json(
        { error: "API key is missing the exports:create scope." },
        { status: 403 },
      );
    }

    const service = createSupabaseServiceClient();
    const { data: release } = await service
      .from("releases")
      .select("id, version, status")
      .eq("id", releaseId)
      .eq("workspace_id", apiKey.workspaceId)
      .maybeSingle();
    if (!release) {
      return NextResponse.json({ error: "Release not found." }, { status: 404 });
    }
    const r = release as { id: string; version: string; status: string };

    const { data: snapshots, error } = await service
      .from("release_token_snapshots")
      .select("name, type, value, resolved_value")
      .eq("release_id", r.id)
      .eq("workspace_id", apiKey.workspaceId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return {
      release: r,
      snapshots: (snapshots ?? []).map((s) => s as SnapshotForExport),
      workspaceId: apiKey.workspaceId,
      userId: null,
      apiKeyId: apiKey.apiKeyId,
    };
  }

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: release } = await supabase
    .from("releases")
    .select("id, version, status")
    .eq("id", releaseId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (!release) {
    return NextResponse.json({ error: "Release not found." }, { status: 404 });
  }

  const r = release as { id: string; version: string; status: string };

  const { data: snapshots, error } = await supabase
    .from("release_token_snapshots")
    .select("name, type, value, resolved_value")
    .eq("release_id", r.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return {
    release: r,
    snapshots: (snapshots ?? []).map((s) => {
      const row = s as {
        name: string;
        type: TokenType;
        value: string;
        resolved_value: string;
      };
      return row;
    }),
    workspaceId: workspace.workspaceId,
    userId: user.id,
    apiKeyId: null,
  };
}

export async function auditExport(
  workspaceId: string,
  releaseId: string,
  format: string,
  actor: { userId: string | null; apiKeyId: string | null },
  version: string,
) {
  try {
    const service = createSupabaseServiceClient();
    await service.rpc("record_audit" as never, {
      ws_id: workspaceId,
      p_action: "export.created",
      p_entity_type: "Release",
      p_entity_id: releaseId,
      p_after: {
        format,
        version,
        actor_id: actor.userId,
        api_key_id: actor.apiKeyId,
      },
    } as never);
  } catch {
    // best-effort
  }
}

export function fileResponse(
  body: string,
  filename: string,
  contentType: string,
): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
