import { extractReferences, resolveReferences } from "./references";

export type ValidationIssue = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  resolvedValue?: string;
};

const NAME_PATTERN = /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/;

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/;
const HSL = /^hsla?\(\s*\d+(?:deg)?\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+\s*)?\)$/;
const LENGTH = /^-?[\d.]+(px|rem|em|%|vh|vw|vmin|vmax)$/;
const NUMBER = /^-?[\d.]+$/;
const DURATION = /^[\d.]+(ms|s)$/;

export type ValidateInput = {
  name: string;
  type: string;
  value: string;
  tokensByName: Map<string, string>;
  /** Token names that already exist in the workspace (excluding this one). */
  existingNames?: Set<string>;
  description?: string;
};

export function validateToken(input: ValidateInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input.name) {
    issues.push({
      severity: "error",
      code: "name.required",
      message: "Token name is required.",
      path: "name",
    });
  } else if (!NAME_PATTERN.test(input.name)) {
    issues.push({
      severity: "error",
      code: "name.invalid",
      message:
        "Token names must be dotted lowercase paths (e.g. color.blue.600).",
      path: "name",
    });
  }

  if (input.existingNames?.has(input.name)) {
    issues.push({
      severity: "error",
      code: "name.duplicate",
      message: `Another token already uses the name ${input.name}.`,
      path: "name",
    });
  }

  if (!input.value) {
    issues.push({
      severity: "error",
      code: "value.required",
      message: "Token value is required.",
      path: "value",
    });
  }

  if (!input.description) {
    issues.push({
      severity: "warning",
      code: "description.missing",
      message: "Add usage guidance to help engineers pick the right token.",
      path: "description",
    });
  }

  const refs = extractReferences(input.value);
  for (const ref of refs) {
    if (!input.tokensByName.has(ref)) {
      issues.push({
        severity: "error",
        code: "ref.missing",
        message: `Reference {${ref}} does not exist.`,
        path: "value",
      });
    }
  }

  let resolvedValue: string | undefined;
  if (issues.every((i) => i.severity !== "error")) {
    const resolved = resolveReferences(input.value, {
      tokens: input.tokensByName,
    });
    if (resolved.ok) {
      resolvedValue = resolved.value;
      const literalIssue = checkLiteralValue(input.type, resolvedValue);
      if (literalIssue) issues.push(literalIssue);
    } else {
      issues.push({
        severity: "error",
        code: "ref.resolution",
        message: resolved.error,
        path: "value",
      });
    }
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
    resolvedValue,
  };
}

function checkLiteralValue(
  type: string,
  resolved: string,
): ValidationIssue | null {
  switch (type) {
    case "color":
      if (HEX.test(resolved) || RGB.test(resolved) || HSL.test(resolved))
        return null;
      return {
        severity: "error",
        code: "value.invalid_color",
        message: "Color value must be a hex, rgb(), or hsl() value.",
        path: "value",
      };
    case "spacing":
    case "sizing":
    case "radius":
    case "border_width":
      if (LENGTH.test(resolved)) return null;
      return {
        severity: "error",
        code: "value.invalid_length",
        message: "Value must include a unit (e.g. 16px, 1rem).",
        path: "value",
      };
    case "duration":
      if (DURATION.test(resolved)) return null;
      return {
        severity: "error",
        code: "value.invalid_duration",
        message: "Duration must end in ms or s (e.g. 150ms).",
        path: "value",
      };
    case "opacity":
    case "z_index":
      if (NUMBER.test(resolved)) return null;
      return {
        severity: "error",
        code: "value.invalid_number",
        message: "Value must be numeric.",
        path: "value",
      };
    default:
      return null;
  }
}
