import { exportStyleDictionary } from "@/lib/core/exporters/json";
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
    "style_dictionary",
    payload.userId,
    payload.release.version,
  );

  return fileResponse(
    exportStyleDictionary(payload.snapshots),
    `tokens-${payload.release.version}.tokens.json`,
    "application/json",
  );
}
