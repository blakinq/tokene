import { exportJson } from "@/lib/core/exporters/json";
import {
  auditExport,
  fileResponse,
  loadExportPayload,
} from "../_shared";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  const { releaseId } = await params;
  const payload = await loadExportPayload(releaseId);
  if (payload instanceof Response) return payload;

  await auditExport(
    payload.workspaceId,
    payload.release.id,
    "json",
    payload.userId,
    payload.release.version,
  );

  return fileResponse(
    exportJson(payload.snapshots),
    `tokens-${payload.release.version}.json`,
    "application/json",
  );
}
