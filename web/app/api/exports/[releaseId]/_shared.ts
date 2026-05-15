import { NextResponse } from "next/server";

import { authenticateApiKey, hasScope } from "@/lib/supabase/api-key";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { TokenLevel, TokenType } from "@/lib/supabase/types";
import type { SnapshotForExport } from "@/lib/core/exporters/css";

export type ExportOptions = {
  includeDeprecated: boolean;
  resolveReferences: boolean;
  levels: TokenLevel[] | null;
  types: TokenType[] | null;
  prefix: string | null;
};

export type ExportPayload = {
  release: { id: string; version: string; status: string };
  snapshots: SnapshotForExport[];
  options: ExportOptions;
  workspaceId: string;
  userId: string | null;
  apiKeyId: string | null;
};

const TOKEN_LEVELS: TokenLevel[] = ["primitive", "semantic", "component"];
const TOKEN_TYPES: TokenType[] = [
  "color",
  "spacing",
  "sizing",
  "radius",
  "border_width",
  "typography",
  "shadow",
  "opacity",
  "z_index",
  "duration",
  "easing",
];

export function parseExportOptions(url: URL): ExportOptions {
  const truthy = (v: string | null) =>
    v != null && ["1", "true", "yes"].includes(v.toLowerCase());

  const levelsRaw = url.searchParams.get("levels");
  const levels = levelsRaw
    ? (levelsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is TokenLevel =>
          (TOKEN_LEVELS as string[]).includes(s),
        ) as TokenLevel[])
    : null;

  const typesRaw = url.searchParams.get("types");
  const types = typesRaw
    ? (typesRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is TokenType =>
          (TOKEN_TYPES as string[]).includes(s),
        ) as TokenType[])
    : null;

  return {
    includeDeprecated: truthy(url.searchParams.get("includeDeprecated")),
    // Defaults to true to preserve historical behaviour.
    resolveReferences:
      url.searchParams.get("resolveReferences") === null
        ? true
        : truthy(url.searchParams.get("resolveReferences")),
    levels: levels && levels.length > 0 ? levels : null,
    types: types && types.length > 0 ? types : null,
    prefix: url.searchParams.get("prefix"),
  };
}

function applyOptions(
  snapshots: Array<{
    name: string;
    type: TokenType;
    level?: TokenLevel | null;
    value: string;
    resolved_value: string;
    deprecated?: boolean | null;
  }>,
  options: ExportOptions,
): SnapshotForExport[] {
  return snapshots
    .filter((s) => options.includeDeprecated || !s.deprecated)
    .filter((s) =>
      options.levels == null || (s.level != null && options.levels.includes(s.level)),
    )
    .filter((s) => options.types == null || options.types.includes(s.type))
    .map((s) => ({
      name: options.prefix ? `${options.prefix}${s.name}` : s.name,
      type: s.type,
      value: s.value,
      resolved_value: options.resolveReferences ? s.resolved_value : s.value,
    }));
}

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
  const options = request
    ? parseExportOptions(new URL(request.url))
    : parseExportOptions(new URL("http://localhost/"));

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
      .select("name, type, level, value, resolved_value, deprecated")
      .eq("release_id", r.id)
      .eq("workspace_id", apiKey.workspaceId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return {
      release: r,
      snapshots: applyOptions(
        (snapshots ?? []) as Array<{
          name: string;
          type: TokenType;
          level: TokenLevel | null;
          value: string;
          resolved_value: string;
          deprecated: boolean | null;
        }>,
        options,
      ),
      options,
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
    .select("name, type, level, value, resolved_value, deprecated")
    .eq("release_id", r.id)
    .eq("workspace_id", workspace.workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return {
    release: r,
    snapshots: applyOptions(
      (snapshots ?? []) as Array<{
        name: string;
        type: TokenType;
        level: TokenLevel | null;
        value: string;
        resolved_value: string;
        deprecated: boolean | null;
      }>,
      options,
    ),
    options,
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
