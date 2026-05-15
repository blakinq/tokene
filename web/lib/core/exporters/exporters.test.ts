import { describe, expect, it } from "vitest";

import { exportCss, toCssName, type SnapshotForExport } from "./css";
import { exportScss } from "./scss";
import { exportTypeScript } from "./typescript";
import { exportJson, exportStyleDictionary } from "./json";

const snapshots: SnapshotForExport[] = [
  {
    name: "color.blue.600",
    type: "color",
    value: "#005FCC",
    resolved_value: "#005FCC",
  },
  {
    name: "color.background.brand",
    type: "color",
    value: "{color.blue.600}",
    resolved_value: "#005FCC",
  },
  {
    name: "space.sm",
    type: "spacing",
    value: "8px",
    resolved_value: "8px",
  },
];

describe("toCssName", () => {
  it("flattens dots and underscores into dashes", () => {
    expect(toCssName("color.background.brand")).toBe(
      "color-background-brand",
    );
    expect(toCssName("border_width.sm")).toBe("border-width-sm");
  });
});

describe("exporters: determinism", () => {
  const reversed = [...snapshots].reverse();

  it("CSS output is sorted by name regardless of input order", () => {
    expect(exportCss(snapshots)).toBe(exportCss(reversed));
  });

  it("SCSS output is sorted", () => {
    expect(exportScss(snapshots)).toBe(exportScss(reversed));
  });

  it("TypeScript output is sorted", () => {
    expect(exportTypeScript(snapshots)).toBe(exportTypeScript(reversed));
  });

  it("JSON output is sorted", () => {
    expect(exportJson(snapshots)).toBe(exportJson(reversed));
  });

  it("Style Dictionary output is sorted", () => {
    expect(exportStyleDictionary(snapshots)).toBe(
      exportStyleDictionary(reversed),
    );
  });
});

describe("exporters: shape", () => {
  it("CSS stamps the exporter version and renders :root variables", () => {
    const css = exportCss(snapshots);
    expect(css).toMatch(/exporter \d+\.\d+\.\d+/);
    expect(css).toContain("--color-background-brand: #005FCC;");
    expect(css).toContain("--color-blue-600: #005FCC;");
    expect(css).toContain("--space-sm: 8px;");
  });

  it("SCSS renders $-prefixed variables", () => {
    const scss = exportScss(snapshots);
    expect(scss).toContain("$color-blue-600: #005FCC;");
    expect(scss).toContain("$space-sm: 8px;");
  });

  it("TypeScript renders an `as const` map keyed by full token name", () => {
    const ts = exportTypeScript(snapshots);
    expect(ts).toContain('"color.blue.600": "#005FCC"');
    expect(ts).toContain("} as const;");
    expect(ts).toContain("export type TokenName = keyof typeof tokens;");
  });

  it("JSON renders a sorted flat map with exporter metadata", () => {
    const json = exportJson(snapshots);
    const parsed = JSON.parse(json);
    expect(parsed.exporter.format).toBe("json");
    expect(parsed.tokens["color.blue.600"]).toEqual({
      value: "#005FCC",
      type: "color",
    });
    expect(Object.keys(parsed.tokens)).toEqual([
      "color.background.brand",
      "color.blue.600",
      "space.sm",
    ]);
  });

  it("Style Dictionary nests dotted names into a tree", () => {
    const json = exportStyleDictionary(snapshots);
    const parsed = JSON.parse(json);
    expect(parsed.color.blue["600"]).toEqual({
      value: "#005FCC",
      type: "color",
    });
    expect(parsed.color.background.brand).toEqual({
      value: "#005FCC",
      type: "color",
    });
    expect(parsed.space.sm).toEqual({
      value: "8px",
      type: "spacing",
    });
  });
});
