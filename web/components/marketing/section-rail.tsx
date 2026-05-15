"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const sections = [
  { id: "intro",      n: "01", label: "Intro" },
  { id: "workflow",   n: "02", label: "Workflow" },
  { id: "features",   n: "03", label: "Features" },
  { id: "exports",    n: "04", label: "Exports" },
  { id: "governance", n: "05", label: "Governance" },
  { id: "faq",        n: "06", label: "FAQ" },
];

export function SectionRail() {
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.1, 0.25, 0.5] },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed left-6 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
    >
      <ul className="pointer-events-auto flex flex-col gap-1">
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id}>
              <Link
                href={`#${s.id}`}
                className="group flex items-center gap-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.18em]"
              >
                <span
                  className="block h-px bg-foreground/30"
                  style={{
                    width: isActive ? 36 : 16,
                    backgroundColor: isActive
                      ? "var(--foreground)"
                      : "color-mix(in oklab, var(--foreground) 25%, transparent)",
                    transition:
                      "width 480ms var(--ease-out-expo), background-color 320ms var(--ease-out-quart)",
                  }}
                />
                <span
                  className="transition-colors duration-300"
                  style={{
                    color: isActive
                      ? "var(--foreground)"
                      : "color-mix(in oklab, var(--foreground) 45%, transparent)",
                  }}
                >
                  {s.n} {isActive ? s.label : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
