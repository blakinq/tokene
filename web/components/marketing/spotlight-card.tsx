"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function SpotlightCard({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`group relative overflow-hidden rounded-xl border bg-card transition-colors duration-300 hover:border-foreground/20 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--sx,50%) var(--sy,50%), color-mix(in oklab, var(--foreground) 7%, transparent), transparent 45%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-px rounded-[11px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(240px circle at var(--sx,50%) var(--sy,50%), color-mix(in oklab, var(--foreground) 14%, transparent), transparent 60%)",
          maskImage: "linear-gradient(black, black)",
          WebkitMaskImage: "linear-gradient(black, black)",
          mixBlendMode: "overlay",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
