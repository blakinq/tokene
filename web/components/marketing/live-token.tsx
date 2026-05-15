"use client";

import { useEffect, useRef, useState } from "react";

type State = {
  value: string;
  status: "draft" | "in_review" | "approved" | "published";
  release: string;
};

const states: State[] = [
  { value: "#2f6feb", status: "draft",       release: "—" },
  { value: "#2f6feb", status: "in_review",   release: "—" },
  { value: "#1f5fdb", status: "approved",    release: "queued" },
  { value: "#1f5fdb", status: "published",   release: "v2026.05.15" },
];

const statusLabel: Record<State["status"], string> = {
  draft:       "draft",
  in_review:   "in review",
  approved:    "approved",
  published:   "published",
};

const statusDot: Record<State["status"], string> = {
  draft:       "bg-muted-foreground/60",
  in_review:   "bg-amber-500",
  approved:    "bg-sky-500",
  published:   "bg-emerald-500",
};

export function LiveToken() {
  const [i, setI] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % states.length), 2400);
    return () => window.clearInterval(id);
  }, []);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -y * 3.5, ry: x * 5 });
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(2)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(2)}%`);
  }
  function onLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  const s = states[i];

  return (
    <div
      ref={cardRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="group relative rounded-2xl border bg-card shadow-sm"
      style={{
        transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: "transform 360ms var(--ease-out-expo)",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx,50%) var(--my,50%), color-mix(in oklab, var(--foreground) 6%, transparent), transparent 40%)",
        }}
      />

      <div className="flex items-center justify-between border-b px-5 py-3 text-xs">
        <span className="font-mono text-muted-foreground">tokens / color.brand.500</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusDot[s.status]}`}
            style={{ transition: "background-color 300ms var(--ease-out-quart)" }}
          />
          <span
            key={s.status}
            style={{ animation: "value-in 360ms var(--ease-out-expo)" }}
          >
            {statusLabel[s.status]}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-6 px-5 py-6 md:grid-cols-3">
        <Field label="Name" mono value="color.brand.500" />

        <Field
          label="Value"
          value={
            <span className="inline-flex items-center gap-2.5">
              <span
                className="relative inline-block h-5 w-5 overflow-hidden rounded border"
                style={{
                  backgroundColor: s.value,
                  transition: "background-color 480ms var(--ease-out-quart)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(75deg, transparent 0%, color-mix(in oklab, white 55%, transparent) 50%, transparent 100%)",
                    animation: "shimmer 3.6s var(--ease-in-out-quart) infinite",
                  }}
                />
              </span>
              <span
                key={s.value}
                className="font-mono text-sm"
                style={{ animation: "value-in 360ms var(--ease-out-expo)" }}
              >
                {s.value}
              </span>
            </span>
          }
        />

        <Field label="Type" mono value="color" />
        <Field label="Group" mono value="brand" />
        <Field label="Refs" value="—" />
        <Field
          label="Release"
          mono
          value={
            <span
              key={s.release}
              className="inline-block"
              style={{ animation: "value-in 360ms var(--ease-out-expo)" }}
            >
              {s.release}
            </span>
          }
        />
      </div>

      <div className="flex items-center justify-between border-t bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">
        <span>Referenced by 14 tokens</span>
        <span className="flex items-center gap-1.5">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          live
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
