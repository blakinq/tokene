import { exportTypeScript } from "@/lib/core/exporters/typescript";
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
    "typescript",
    { userId: payload.userId, apiKeyId: payload.apiKeyId },
    payload.release.version,
  );

  return fileResponse(
    exportTypeScript(payload.snapshots),
    `tokens-${payload.release.version}.ts`,
    "text/typescript",
  );
}
