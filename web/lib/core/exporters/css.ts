import type { TokenType } from "@/lib/supabase/types";

export type SnapshotForExport = {
  name: string;
  type: TokenType;
  value: string;
  resolved_value: string;
};

const EXPORTER_VERSION = "1.0.0";

/**
 * Generate a deterministic `:root { --token-name: value; }` CSS file from a
 * release snapshot. Sorted by name for stable output.
 */
export function exportCss(snapshots: SnapshotForExport[]): string {
  const sorted = [...snapshots].sort((a, b) => a.name.localeCompare(b.name));
  const lines = sorted.map(
    (snap) => `  --${toCssName(snap.name)}: ${snap.resolved_value};`,
  );
  return [
    `/* TokenOps CSS export · exporter ${EXPORTER_VERSION} */`,
    `:root {`,
    ...lines,
    `}`,
    "",
  ].join("\n");
}

/** Convert `color.background.brand` → `color-background-brand`. */
export function toCssName(tokenName: string): string {
  return tokenName.toLowerCase().replace(/\./g, "-").replace(/_/g, "-");
}
