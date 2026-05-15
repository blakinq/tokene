import { exportCss } from "@/lib/core/exporters/css";
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
    "css",
    { userId: payload.userId, apiKeyId: payload.apiKeyId },
    payload.release.version,
  );

  return fileResponse(
    exportCss(payload.snapshots),
    `tokens-${payload.release.version}.css`,
    "text/css",
  );
}
