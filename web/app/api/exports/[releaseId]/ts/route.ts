import { exportTypeScript } from "@/lib/core/exporters/typescript";
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
    "typescript",
    payload.userId,
    payload.release.version,
  );

  return fileResponse(
    exportTypeScript(payload.snapshots),
    `tokens-${payload.release.version}.ts`,
    "text/typescript",
  );
}
