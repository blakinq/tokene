import type { SnapshotForExport } from "./css";

const EXPORTER_VERSION = "1.0.0";

/** Convert `color.background.brand` → `colorBackgroundBrand`. */
function toCamelCase(tokenName: string): string {
  const parts = tokenName.split(/[._-]/).filter(Boolean);
  return parts
    .map((part, i) => {
      if (/^\d/.test(part)) return `_${part}`;
      if (i === 0) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

export function exportTypeScript(snapshots: SnapshotForExport[]): string {
  const sorted = [...snapshots].sort((a, b) => a.name.localeCompare(b.name));
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const snap of sorted) {
    let key = toCamelCase(snap.name);
    let n = 2;
    while (seen.has(key)) key = `${toCamelCase(snap.name)}${n++}`;
    seen.add(key);
    entries.push(
      `  ${JSON.stringify(snap.name)}: ${JSON.stringify(snap.resolved_value)},`,
    );
  }
  return [
    `// Tokene TypeScript export · exporter ${EXPORTER_VERSION}`,
    `export const tokens = {`,
    ...entries,
    `} as const;`,
    ``,
    `export type TokenName = keyof typeof tokens;`,
    ``,
  ].join("\n");
}
