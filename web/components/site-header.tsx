"use client";

import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandMenu } from "@/components/command-menu";

type Crumb = { label: string; href?: string };

export function SiteHeader({
  crumbs,
  primaryAction,
}: {
  crumbs: Crumb[];
  primaryAction?: { label: string; href: string };
}) {
  return (
    <header className="bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 text-sm"
      >
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span className="text-muted-foreground/50" aria-hidden>
                /
              </span>
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground truncate transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground truncate font-medium">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1.5">
        <CommandMenu />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
        {primaryAction ? (
          <Button asChild size="sm">
            <Link href={primaryAction.href}>
              <Plus data-icon="inline-start" />
              {primaryAction.label}
            </Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export function SearchTrigger({
  onClick,
}: {
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground w-56 justify-start gap-2 font-normal"
    >
      <Search data-icon="inline-start" />
      Search tokens
      <KbdGroup className="ml-auto">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  );
}
