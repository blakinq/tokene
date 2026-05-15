import { describe, expect, it } from "vitest";

import { parseTokensJson } from "./importer";

describe("parseTokensJson", () => {
  it("parses flat name → value pairs", () => {
    const input = JSON.stringify({
      "color.blue.600": "#005FCC",
      "space.sm": "8px",
    });
    const result = parseTokensJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens.find((t) => t.name === "color.blue.600")).toMatchObject({
        type: "color",
        value: "#005FCC",
      });
    }
  });

  it("parses flat objects with explicit type", () => {
    const input = JSON.stringify({
      "color.blue.600": { value: "#005FCC", type: "color" },
    });
    const result = parseTokensJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tokens[0]).toEqual({
        name: "color.blue.600",
        type: "color",
        value: "#005FCC",
      });
    }
  });

  it("parses Style Dictionary nested objects", () => {
    const input = JSON.stringify({
      color: {
        blue: {
          "600": { value: "#005FCC", type: "color" },
        },
      },
    });
    const result = parseTokensJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tokens).toEqual([
        { name: "color.blue.600", type: "color", value: "#005FCC" },
      ]);
    }
  });

  it("unwraps a top-level `tokens` key", () => {
    const input = JSON.stringify({
      tokens: { "color.blue.600": "#005FCC" },
    });
    const result = parseTokensJson(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tokens[0].name).toBe("color.blue.600");
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseTokensJson("not json");
    expect(result.ok).toBe(false);
  });

  it("rejects an empty object", () => {
    const result = parseTokensJson("{}");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No tokens/);
  });

  it("rejects a top-level array", () => {
    const result = parseTokensJson("[]");
    expect(result.ok).toBe(false);
  });
});
