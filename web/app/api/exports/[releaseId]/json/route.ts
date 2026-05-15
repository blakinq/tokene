import { exportJson } from "@/lib/core/exporters/json";
import {
  auditExport,
  fileResponse,
  loadExportPayload,
} from "../_shared";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await params;
  const payload = await loadExportPayload(releaseId, req);
  if (payload instanceof Response) return payload;

  await auditExport(
    payload.workspaceId,
    payload.release.id,
    "json",
    { userId: payload.userId, apiKeyId: payload.apiKeyId },
    payload.release.version,
  );

  return fileResponse(
    exportJson(payload.snapshots),
    `tokens-${payload.release.version}.json`,
    "application/json",
  );
}
