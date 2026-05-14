/** Reference syntax: `{path.to.token}`. */
const REFERENCE_PATTERN = /\{([^{}]+)\}/g;

export function extractReferences(value: string): string[] {
  const matches: string[] = [];
  for (const m of value.matchAll(REFERENCE_PATTERN)) {
    matches.push(m[1].trim());
  }
  return matches;
}

export type ResolveOptions = {
  /** Map of token name → raw value. */
  tokens: Map<string, string>;
};

export type ResolveResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Substitute `{token.name}` references with their resolved values.
 * Detects missing references and circular chains.
 */
export function resolveReferences(
  rawValue: string,
  opts: ResolveOptions,
  visited: Set<string> = new Set(),
): ResolveResult {
  const refs = extractReferences(rawValue);
  if (refs.length === 0) return { ok: true, value: rawValue };

  let result = rawValue;
  for (const ref of refs) {
    if (visited.has(ref)) {
      return { ok: false, error: `Circular reference through {${ref}}` };
    }
    const next = opts.tokens.get(ref);
    if (next === undefined) {
      return { ok: false, error: `Reference {${ref}} does not exist` };
    }
    const nested = resolveReferences(next, opts, new Set([...visited, ref]));
    if (!nested.ok) return nested;
    result = result.split(`{${ref}}`).join(nested.value);
  }
  return { ok: true, value: result };
}
