import { exportScss } from "@/lib/core/exporters/scss";
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
    "scss",
    payload.userId,
    payload.release.version,
  );

  return fileResponse(
    exportScss(payload.snapshots),
    `tokens-${payload.release.version}.scss`,
    "text/x-scss",
  );
}
