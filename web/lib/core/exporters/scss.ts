import type { SnapshotForExport } from "./css";
import { toCssName } from "./css";

const EXPORTER_VERSION = "1.0.0";

export function exportScss(snapshots: SnapshotForExport[]): string {
  const sorted = [...snapshots].sort((a, b) => a.name.localeCompare(b.name));
  const lines = sorted.map(
    (snap) => `$${toCssName(snap.name)}: ${snap.resolved_value};`,
  );
  return [
    `// Tokene SCSS export · exporter ${EXPORTER_VERSION}`,
    ...lines,
    "",
  ].join("\n");
}
