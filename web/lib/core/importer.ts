import type { TokenType } from "@/lib/supabase/types";

export type ParsedToken = {
  name: string;
  type: TokenType;
  value: string;
};

export type ParseResult =
  | { ok: true; tokens: ParsedToken[] }
  | { ok: false; error: string };

const VALID_TYPES = new Set<TokenType>([
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
]);

function inferType(name: string, value: string): TokenType {
  const first = name.split(".")[0];
  switch (first) {
    case "color":
      return "color";
    case "space":
    case "spacing":
      return "spacing";
    case "size":
    case "sizing":
      return "sizing";
    case "radius":
      return "radius";
    case "border":
      return "border_width";
    case "font":
    case "typography":
      return "typography";
    case "shadow":
      return "shadow";
    case "opacity":
      return "opacity";
    case "z":
    case "z_index":
    case "zindex":
      return "z_index";
    case "duration":
    case "time":
      return "duration";
    case "easing":
      return "easing";
  }
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return "color";
  if (/^rgba?\(/i.test(value)) return "color";
  if (/^[\d.]+(ms|s)$/.test(value)) return "duration";
  if (/^-?[\d.]+(px|rem|em|%)$/.test(value)) return "spacing";
  return "color";
}

function isLeaf(node: unknown): node is { value: unknown; type?: unknown } {
  return (
    typeof node === "object" &&
    node !== null &&
    !Array.isArray(node) &&
    "value" in (node as Record<string, unknown>)
  );
}

function walk(
  node: unknown,
  path: string[],
  out: ParsedToken[],
): string | null {
  if (typeof node !== "object" || node === null) {
    return `Unexpected value at ${path.join(".")}`;
  }

  if (isLeaf(node)) {
    const leaf = node as { value: unknown; type?: unknown };
    if (typeof leaf.value !== "string") {
      return `Token ${path.join(".")} must have a string value.`;
    }
    const name = path.join(".");
    let type: TokenType;
    if (typeof leaf.type === "string" && VALID_TYPES.has(leaf.type as TokenType)) {
      type = leaf.type as TokenType;
    } else {
      type = inferType(name, leaf.value);
    }
    out.push({ name, type, value: leaf.value });
    return null;
  }

  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === "string") {
      const name = [...path, k].join(".");
      out.push({ name, type: inferType(name, v), value: v });
      continue;
    }
    const err = walk(v, [...path, k], out);
    if (err) return err;
  }
  return null;
}

/**
 * Parse a JSON string in either:
 *  - flat: `{ "color.blue.600": "#005FCC" }` or `{ name: { value, type } }`
 *  - nested (Style Dictionary): `{ color: { blue: { 600: { value, type } } } }`
 */
export function parseTokensJson(input: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { ok: false, error: "Expected a JSON object at the top level." };
  }

  // Style-Dictionary-style nested files often wrap under `tokens`.
  if (
    "tokens" in (json as Record<string, unknown>) &&
    typeof (json as { tokens: unknown }).tokens === "object" &&
    (json as { tokens: unknown }).tokens !== null
  ) {
    json = (json as { tokens: unknown }).tokens;
  }

  const tokens: ParsedToken[] = [];
  const err = walk(json, [], tokens);
  if (err) return { ok: false, error: err };
  if (tokens.length === 0) {
    return { ok: false, error: "No tokens found in file." };
  }
  return { ok: true, tokens };
}
