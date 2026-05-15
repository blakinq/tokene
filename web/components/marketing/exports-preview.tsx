"use client";

import { useLayoutEffect, useRef, useState } from "react";

const css = `:root {
  --color-brand-500: #2f6feb;
  --color-brand-600: #1e54c6;
  --color-bg-surface: #ffffff;
  --color-text-default: #0b0d10;
  --space-2: 8px;
  --space-3: 12px;
  --radius-md: 8px;
}`;

const scss = `$color-brand-500: #2f6feb;
$color-brand-600: #1e54c6;
$color-bg-surface: #ffffff;
$color-text-default: #0b0d10;
$space-2: 8px;
$space-3: 12px;
$radius-md: 8px;`;

const ts = `export const tokens = {
  color: {
    brand: { 500: "#2f6feb", 600: "#1e54c6" },
    bg:    { surface: "#ffffff" },
    text:  { default: "#0b0d10" },
  },
  space:  { 2: 8, 3: 12 },
  radius: { md: 8 },
} as const;`;

const json = `{
  "color": {
    "brand": {
      "500": { "value": "#2f6feb", "type": "color" },
      "600": { "value": "#1e54c6", "type": "color" }
    },
    "bg":   { "surface": { "value": "#ffffff", "type": "color" } },
    "text": { "default": { "value": "#0b0d10", "type": "color" } }
  }
}`;

type Key = "css" | "scss" | "ts" | "json";
const tabs: { key: Key; label: string; body: string; ext: string }[] = [
  { key: "css",  label: "CSS",            body: css,  ext: "tokens.css" },
  { key: "scss", label: "SCSS",           body: scss, ext: "tokens.scss" },
  { key: "ts",   label: "TypeScript",     body: ts,   ext: "tokens.ts" },
  { key: "json", label: "Style Dictionary", body: json, ext: "tokens.json" },
];

export function ExportsPreview() {
  const [active, setActive] = useState<Key>("css");
  const wrapRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Record<Key, HTMLButtonElement | null>>({
    css: null,
    scss: null,
    ts: null,
    json: null,
  });
  const [indicator, setIndicator] = useState({ x: 0, w: 0 });

  useLayoutEffect(() => {
    const btn = refs.current[active];
    const wrap = wrapRef.current;
    if (!btn || !wrap) return;
    const br = btn.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    setIndicator({ x: br.left - wr.left, w: br.width });
  }, [active]);

  const current = tabs.find((t) => t.key === active)!;
  const lines = current.body.split("\n");

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div ref={wrapRef} className="relative flex gap-1">
          <span
            aria-hidden
            className="absolute inset-y-1 rounded-md bg-muted"
            style={{
              transform: `translateX(${indicator.x}px)`,
              width: indicator.w,
              transition:
                "transform 420ms var(--ease-spring), width 420ms var(--ease-spring)",
            }}
          />
          {tabs.map((t) => (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              onClick={() => setActive(t.key)}
              className={`relative z-10 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                active === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span
          key={current.ext}
          className="font-mono text-[11px] text-muted-foreground"
          style={{ animation: "value-in 280ms var(--ease-out-expo)" }}
        >
          {current.ext}
        </span>
      </div>

      <div className="relative">
        <pre
          key={current.key}
          className="overflow-x-auto bg-muted/30 p-5 font-mono text-[12.5px] leading-relaxed"
        >
          <code>
            {lines.map((line, i) => (
              <span
                key={`${current.key}-${i}`}
                className="block"
                style={{
                  animation: `code-line-in 360ms var(--ease-out-expo) ${i * 22}ms both`,
                }}
              >
                {line || " "}
              </span>
            ))}
          </code>
        </pre>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent"
        />
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
        <span className="font-mono">exporter v3.4.0 · sorted by name</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          deterministic
        </span>
      </div>
    </div>
  );
}
