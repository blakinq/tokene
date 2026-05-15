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

/** Mirror of public.schema_configs columns relevant to validation. */
export type SchemaConfig = {
  namingPattern: string;
  allowedTokenTypes: string[];
  requiredFields: string[];
};

export const DEFAULT_SCHEMA: SchemaConfig = {
  namingPattern: "^[a-z][a-z0-9]*(\\.[a-z0-9]+)+$",
  allowedTokenTypes: [
    "color",
    "spacing",
    "sizing",
    "radius",
    "border_width",
    "typography",
    "shadow",
    "opacity",
    "z_index",
    "duration",
    "easing",
  ],
  requiredFields: ["name", "type", "value", "description"],
};

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
  /** Workspace governance config (§18). Falls back to DEFAULT_SCHEMA. */
  schema?: SchemaConfig;
};

export function validateToken(input: ValidateInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const schema = input.schema ?? DEFAULT_SCHEMA;

  let nameRegex: RegExp;
  try {
    nameRegex = new RegExp(schema.namingPattern);
  } catch {
    nameRegex = new RegExp(DEFAULT_SCHEMA.namingPattern);
  }

  if (!input.name) {
    issues.push({
      severity: "error",
      code: "name.required",
      message: "Token name is required.",
      path: "name",
    });
  } else if (!nameRegex.test(input.name)) {
    issues.push({
      severity: "error",
      code: "name.invalid",
      message: `Token name must match ${schema.namingPattern}.`,
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

  if (input.type && !schema.allowedTokenTypes.includes(input.type)) {
    issues.push({
      severity: "error",
      code: "type.disallowed",
      message: `Token type "${input.type}" is not enabled for this workspace.`,
      path: "type",
    });
  }

  const requireValue = schema.requiredFields.includes("value");
  if (requireValue && !input.value) {
    issues.push({
      severity: "error",
      code: "value.required",
      message: "Token value is required.",
      path: "value",
    });
  }

  const requireDescription = schema.requiredFields.includes("description");
  if (!input.description) {
    issues.push({
      severity: requireDescription ? "error" : "warning",
      code: "description.missing",
      message: requireDescription
        ? "Workspace settings require a description on every token."
        : "Add usage guidance to help engineers pick the right token.",
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
