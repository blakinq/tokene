import { describe, expect, it } from "vitest";

import { DEFAULT_SCHEMA, validateToken } from "./validation";

function v(input: Parameters<typeof validateToken>[0]) {
  return validateToken(input);
}

describe("validateToken", () => {
  it("accepts a well-formed color", () => {
    const result = v({
      name: "color.blue.600",
      type: "color",
      value: "#005FCC",
      description: "Brand blue",
      tokensByName: new Map(),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(true);
    expect(result.resolvedValue).toBe("#005FCC");
  });

  it("rejects a malformed token name", () => {
    const result = v({
      name: "ColorBlue600",
      type: "color",
      value: "#005FCC",
      description: "x",
      tokensByName: new Map(),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.code === "name.invalid")).toBeTruthy();
  });

  it("flags duplicate names", () => {
    const result = v({
      name: "color.blue.600",
      type: "color",
      value: "#005FCC",
      description: "x",
      tokensByName: new Map(),
      existingNames: new Set(["color.blue.600"]),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.code === "name.duplicate")).toBeTruthy();
  });

  it("rejects a disallowed type per workspace schema", () => {
    const result = v({
      name: "color.blue.600",
      type: "gradient",
      value: "#005FCC",
      description: "x",
      tokensByName: new Map(),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.code === "type.disallowed")).toBeTruthy();
  });

  it("rejects a length value without a unit", () => {
    const result = v({
      name: "space.sm",
      type: "spacing",
      value: "8",
      description: "x",
      tokensByName: new Map(),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.code === "value.invalid_length")).toBeTruthy();
  });

  it("resolves a reference and validates the resolved literal", () => {
    const tokens = new Map([["color.blue.600", "#005FCC"]]);
    const result = v({
      name: "color.background.brand",
      type: "color",
      value: "{color.blue.600}",
      description: "x",
      tokensByName: tokens,
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(true);
    expect(result.resolvedValue).toBe("#005FCC");
  });

  it("flags a missing reference", () => {
    const result = v({
      name: "color.background.brand",
      type: "color",
      value: "{color.ghost}",
      description: "x",
      tokensByName: new Map(),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.code === "ref.missing")).toBeTruthy();
  });

  it("flags a resolved value that doesn't match the type", () => {
    const tokens = new Map([["space.sm", "8px"]]);
    const result = v({
      name: "color.background.brand",
      type: "color",
      value: "{space.sm}",
      description: "x",
      tokensByName: tokens,
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.code === "value.invalid_color")).toBeTruthy();
  });

  it("warns about a missing description when not required", () => {
    const schema = {
      ...DEFAULT_SCHEMA,
      requiredFields: ["name", "type", "value"],
    };
    const result = v({
      name: "color.blue.600",
      type: "color",
      value: "#005FCC",
      tokensByName: new Map(),
      schema,
    });
    expect(result.valid).toBe(true);
    const issue = result.issues.find((i) => i.code === "description.missing");
    expect(issue?.severity).toBe("warning");
  });

  it("errors on a missing description when the workspace requires it", () => {
    const result = v({
      name: "color.blue.600",
      type: "color",
      value: "#005FCC",
      tokensByName: new Map(),
      schema: DEFAULT_SCHEMA,
    });
    expect(result.valid).toBe(false);
    const issue = result.issues.find((i) => i.code === "description.missing");
    expect(issue?.severity).toBe("error");
  });
});
