import { exportStyleDictionary } from "@/lib/core/exporters/json";
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
    "style_dictionary",
    { userId: payload.userId, apiKeyId: payload.apiKeyId },
    payload.release.version,
  );

  return fileResponse(
    exportStyleDictionary(payload.snapshots),
    `tokens-${payload.release.version}.tokens.json`,
    "application/json",
  );
}
