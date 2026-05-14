import { exportTypeScript } from "@/lib/core/exporters/typescript";
import {
  auditCollectionExport,
  fileResponse,
  loadCollectionExportPayload,
} from "../_shared";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await params;
  const url = new URL(req.url);
  const payload = await loadCollectionExportPayload(
    collectionId,
    url.searchParams.get("release"),
  );
  if (payload instanceof Response) return payload;

  await auditCollectionExport(
    payload.workspaceId,
    payload.collection.id,
    payload.release.id,
    "typescript",
    payload.userId,
  );

  return fileResponse(
    exportTypeScript(payload.snapshots),
    `${payload.collection.slug}-${payload.release.version}.ts`,
    "text/typescript",
  );
}
