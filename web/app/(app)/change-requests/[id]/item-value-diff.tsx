import { ColorSwatch } from "@/components/color-swatch";

/**
 * Inline before/after diff for a CR item, with type-aware previews when the
 * type makes one cheap (color swatch today). Shown on the CR detail page so
 * reviewers don't have to mentally diff two strings.
 */
export function ItemValueDiff({
  type,
  before,
  after,
}: {
  type: string | null;
  before: string | null;
  after: string | null;
}) {
  const unchanged = (before ?? "") === (after ?? "");
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <ValueCell
        label={before == null ? "(new)" : "Before"}
        value={before}
        type={type}
        muted
      />
      <ValueCell
        label={unchanged ? "After (unchanged)" : "After"}
        value={after}
        type={type}
      />
    </div>
  );
}

function ValueCell({
  label,
  value,
  type,
  muted,
}: {
  label: string;
  value: string | null;
  type: string | null;
  muted?: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-md p-3">
      <div className="text-muted-foreground mb-1 text-xs">{label}</div>
      {value == null ? (
        <div className="text-muted-foreground text-sm italic">—</div>
      ) : (
        <div className="flex items-center gap-2">
          {type === "color" && /^#|^rgb|^hsl/.test(value) ? (
            <ColorSwatch value={value} />
          ) : null}
          <code
            className={`font-mono text-sm break-all ${muted ? "text-muted-foreground" : ""}`}
          >
            {value}
          </code>
        </div>
      )}
    </div>
  );
}
