import { describe, expect, it } from "vitest";

import { extractReferences, resolveReferences } from "./references";

describe("extractReferences", () => {
  it("returns names without braces, trimmed", () => {
    expect(extractReferences("{ color.blue.600 }")).toEqual(["color.blue.600"]);
  });
  it("returns multiple references", () => {
    expect(extractReferences("{a} and {b.c}")).toEqual(["a", "b.c"]);
  });
  it("returns empty array on literal value", () => {
    expect(extractReferences("#005FCC")).toEqual([]);
  });
});

describe("resolveReferences", () => {
  it("returns a literal value untouched", () => {
    const result = resolveReferences("#005FCC", { tokens: new Map() });
    expect(result).toEqual({ ok: true, value: "#005FCC" });
  });

  it("resolves a single-hop reference", () => {
    const result = resolveReferences("{color.blue.600}", {
      tokens: new Map([["color.blue.600", "#005FCC"]]),
    });
    expect(result).toEqual({ ok: true, value: "#005FCC" });
  });

  it("resolves a multi-hop reference chain", () => {
    const tokens = new Map([
      ["color.blue.600", "#005FCC"],
      ["color.brand", "{color.blue.600}"],
      ["color.button.bg", "{color.brand}"],
    ]);
    const result = resolveReferences("{color.button.bg}", { tokens });
    expect(result).toEqual({ ok: true, value: "#005FCC" });
  });

  it("flags a missing reference", () => {
    const result = resolveReferences("{color.ghost}", {
      tokens: new Map(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/does not exist/);
  });

  it("detects a direct cycle", () => {
    const tokens = new Map([["a", "{a}"]]);
    const result = resolveReferences("{a}", { tokens });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Circular/);
  });

  it("detects a transitive cycle", () => {
    const tokens = new Map([
      ["a", "{b}"],
      ["b", "{c}"],
      ["c", "{a}"],
    ]);
    const result = resolveReferences("{a}", { tokens });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Circular/);
  });

  it("substitutes references embedded in composite values", () => {
    const tokens = new Map([
      ["space.sm", "8px"],
      ["color.shadow", "rgba(0,0,0,0.1)"],
    ]);
    const result = resolveReferences(
      "0 {space.sm} {space.sm} {color.shadow}",
      { tokens },
    );
    expect(result).toEqual({
      ok: true,
      value: "0 8px 8px rgba(0,0,0,0.1)",
    });
  });
});
