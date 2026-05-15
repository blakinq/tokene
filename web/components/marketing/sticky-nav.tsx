"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function StickyNav({ authed }: { authed: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 transition-all duration-300"
      style={{
        borderBottom: scrolled
          ? "1px solid var(--border)"
          : "1px solid transparent",
        backgroundColor: scrolled
          ? "color-mix(in oklab, var(--background) 78%, transparent)"
          : "transparent",
        backdropFilter: scrolled ? "blur(10px) saturate(140%)" : "blur(0px)",
        WebkitBackdropFilter: scrolled ? "blur(10px) saturate(140%)" : "blur(0px)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background transition-transform duration-300 group-hover:rotate-[8deg]"
          >
            <span className="text-[11px] font-bold leading-none">T</span>
          </span>
          <span>Tokene</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {[
            ["workflow", "Workflow"],
            ["features", "Features"],
            ["exports", "Exports"],
            ["faq", "FAQ"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="relative transition-colors duration-200 hover:text-foreground"
            >
              {label}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full"
              />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {authed ? (
            <Button asChild size="sm" className="press">
              <Link href="/tokens">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="press">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
