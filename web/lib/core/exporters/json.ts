import type { SnapshotForExport } from "./css";

const EXPORTER_VERSION = "1.0.0";

/** Flat `{ "token.name": "resolvedValue" }` map sorted by name. */
export function exportJson(snapshots: SnapshotForExport[]): string {
  const sorted = [...snapshots].sort((a, b) => a.name.localeCompare(b.name));
  const out: Record<string, { value: string; type: string }> = {};
  for (const snap of sorted) {
    out[snap.name] = { value: snap.resolved_value, type: snap.type };
  }
  return (
    JSON.stringify(
      { exporter: { format: "json", version: EXPORTER_VERSION }, tokens: out },
      null,
      2,
    ) + "\n"
  );
}

/**
 * Style Dictionary-compatible nested JSON. `color.blue.600` becomes
 * `{ color: { blue: { 600: { value, type } } } }`.
 */
export function exportStyleDictionary(snapshots: SnapshotForExport[]): string {
  const sorted = [...snapshots].sort((a, b) => a.name.localeCompare(b.name));
  // Use `Json` for the recursive structure; leaves carry `value` + `type`.
  type Tree = { [k: string]: Tree | string };
  const root: Tree = {};

  for (const snap of sorted) {
    const segments = snap.name.split(".");
    let cursor: Tree = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const next = cursor[seg];
      if (typeof next === "string" || next === undefined) {
        const branch: Tree = {};
        cursor[seg] = branch;
        cursor = branch;
      } else {
        cursor = next;
      }
    }
    const leafKey = segments[segments.length - 1];
    cursor[leafKey] = {
      value: snap.resolved_value,
      type: snap.type,
    } as unknown as Tree;
  }

  return JSON.stringify(root, null, 2) + "\n";
}
