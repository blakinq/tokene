"use client";

import { useEffect, useRef, useState } from "react";

const stages = [
  { label: "Draft", desc: "Author proposes a token or edit." },
  { label: "Change Request", desc: "Bundle changes for review." },
  { label: "Review", desc: "Approvers validate intent and impact." },
  { label: "Release", desc: "Immutable snapshot is taken." },
  { label: "Export", desc: "Deterministic artifacts ship downstream." },
];

export function Pipeline() {
  const ref = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol
      ref={ref}
      className="relative grid gap-10 md:grid-cols-5 md:gap-6"
    >
      <div
        aria-hidden
        className="absolute left-0 top-5 hidden h-px bg-border md:block"
        style={{ right: 0 }}
      />
      <div
        aria-hidden
        className="absolute left-0 top-5 hidden h-px origin-left bg-foreground md:block"
        style={{
          right: 0,
          transform: active ? "scaleX(1)" : "scaleX(0)",
          transition: "transform 1400ms var(--ease-out-expo) 200ms",
        }}
      />

      {stages.map((s, i) => {
        const delay = 240 + i * 110;
        return (
          <li key={s.label} className="relative">
            <div className="flex items-center gap-3 md:block">
              <span
                className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background font-mono text-xs"
                style={{
                  transform: active ? "scale(1)" : "scale(0.6)",
                  opacity: active ? 1 : 0,
                  transition: `transform 520ms var(--ease-spring) ${delay}ms, opacity 320ms var(--ease-out-expo) ${delay}ms, background-color 300ms var(--ease-out-quart)`,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div
                className="md:mt-5"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 520ms var(--ease-out-expo) ${delay + 120}ms, transform 520ms var(--ease-out-expo) ${delay + 120}ms`,
                }}
              >
                <div className="text-sm font-medium">{s.label}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {s.desc}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
