const TOKENS = [
  "color.brand.500",
  "color.bg.surface",
  "color.text.muted",
  "space.4",
  "radius.md",
  "shadow.lg",
  "font.body.size",
  "color.border.subtle",
  "ease.spring",
  "duration.normal",
  "color.danger.600",
  "z.overlay",
];

export function TokenMarquee() {
  const items = [...TOKENS, ...TOKENS];
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y bg-card/40"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <div
        className="flex w-max gap-10 py-3 text-[12px] text-muted-foreground"
        style={{
          animation: "marquee-x 38s linear infinite",
          willChange: "transform",
        }}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-2 font-mono tracking-tight">
            <span className="h-1 w-1 rounded-full bg-foreground/40" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
