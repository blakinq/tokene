import { NextResponse } from "next/server";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { TokenType } from "@/lib/supabase/types";
import type { SnapshotForExport } from "@/lib/core/exporters/css";

export type CollectionExportPayload = {
  collection: { id: string; name: string; slug: string };
  release: { id: string; version: string };
  snapshots: SnapshotForExport[];
  workspaceId: string;
  userId: string;
};

/**
 * Load a collection's tokens, filtered against either the requested release
 * (via `?release=<id>`) or the latest published release in the workspace.
 *
 * Returns NextResponse on error (404 / 500), otherwise the payload to export.
 */
export async function loadCollectionExportPayload(
  collectionId: string,
  releaseIdOverride: string | null,
): Promise<CollectionExportPayload | NextResponse> {
  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();

  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, slug")
    .eq("id", collectionId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (!collection) {
    return NextResponse.json(
      { error: "Collection not found." },
      { status: 404 },
    );
  }
  const c = collection as { id: string; name: string; slug: string };

  // Resolve which release to read from.
  let release: { id: string; version: string } | null = null;
  if (releaseIdOverride) {
    const { data } = await supabase
      .from("releases")
      .select("id, version, status")
      .eq("id", releaseIdOverride)
      .eq("workspace_id", workspace.workspaceId)
      .eq("status", "published")
      .maybeSingle();
    release = data
      ? { id: (data as { id: string }).id, version: (data as { version: string }).version }
      : null;
  } else {
    const { data } = await supabase
      .from("releases")
      .select("id, version")
      .eq("workspace_id", workspace.workspaceId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    release = data
      ? { id: (data as { id: string }).id, version: (data as { version: string }).version }
      : null;
  }

  if (!release) {
    return NextResponse.json(
      { error: "No published release to export from." },
      { status: 404 },
    );
  }

  const { data: memberRows } = await supabase
    .from("collection_tokens")
    .select("token_id")
    .eq("collection_id", c.id)
    .eq("workspace_id", workspace.workspaceId);

  const tokenIds = ((memberRows ?? []) as Array<{ token_id: string }>).map(
    (r) => r.token_id,
  );
  if (tokenIds.length === 0) {
    return NextResponse.json(
      { error: "Collection has no tokens." },
      { status: 404 },
    );
  }

  const { data: snaps, error } = await supabase
    .from("release_token_snapshots")
    .select("name, type, value, resolved_value")
    .eq("release_id", release.id)
    .eq("workspace_id", workspace.workspaceId)
    .in("token_id", tokenIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const snapshots = ((snaps ?? []) as Array<{
    name: string;
    type: TokenType;
    value: string;
    resolved_value: string;
  }>);

  if (snapshots.length === 0) {
    return NextResponse.json(
      {
        error:
          "None of this collection's tokens are in the selected release snapshot.",
      },
      { status: 404 },
    );
  }

  return {
    collection: c,
    release,
    snapshots,
    workspaceId: workspace.workspaceId,
    userId: user.id,
  };
}

export async function auditCollectionExport(
  workspaceId: string,
  collectionId: string,
  releaseId: string,
  format: string,
  userId: string,
) {
  try {
    const service = createSupabaseServiceClient();
    await service.rpc("record_audit" as never, {
      ws_id: workspaceId,
      p_action: "export.created",
      p_entity_type: "Collection",
      p_entity_id: collectionId,
      p_after: { format, actor_id: userId, release_id: releaseId },
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
