"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileClock,
  GitPullRequest,
  Layers,
  Search,
  Settings,
  Tag,
  Upload,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { tokens, changeRequests, releases } from "@/lib/mock-data";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hidden h-8 w-64 justify-start gap-2 font-normal md:flex"
      >
        <Search data-icon="inline-start" />
        Search…
        <KbdGroup className="ml-auto">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="md:hidden"
        aria-label="Search"
      >
        <Search />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Find tokens, change requests, releases, and pages."
      >
        <CommandInput placeholder="Search tokens, change requests, releases…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => go("/tokens")}>
              <Layers />
              Tokens
            </CommandItem>
            <CommandItem onSelect={() => go("/change-requests")}>
              <GitPullRequest />
              Change requests
            </CommandItem>
            <CommandItem onSelect={() => go("/releases")}>
              <Tag />
              Releases
            </CommandItem>
            <CommandItem onSelect={() => go("/imports")}>
              <Upload />
              Imports
            </CommandItem>
            <CommandItem onSelect={() => go("/exports")}>
              <Download />
              Exports
            </CommandItem>
            <CommandItem onSelect={() => go("/audit")}>
              <FileClock />
              Audit log
            </CommandItem>
            <CommandItem onSelect={() => go("/settings")}>
              <Settings />
              Settings
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tokens">
            {tokens.slice(0, 6).map((token) => (
              <CommandItem
                key={token.id}
                onSelect={() => go(`/tokens/${token.id}`)}
                value={`token ${token.name}`}
              >
                <Layers />
                <span className="font-mono text-xs">{token.name}</span>
                <span className="text-muted-foreground ml-auto font-mono text-xs">
                  {token.resolvedValue}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Change requests">
            {changeRequests.slice(0, 4).map((cr) => (
              <CommandItem
                key={cr.id}
                onSelect={() => go(`/change-requests/${cr.id}`)}
                value={`cr ${cr.shortId} ${cr.title}`}
              >
                <GitPullRequest />
                <span className="text-muted-foreground font-mono text-xs">
                  {cr.shortId}
                </span>
                <span className="truncate">{cr.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Releases">
            {releases.slice(0, 4).map((release) => (
              <CommandItem
                key={release.id}
                onSelect={() => go(`/releases/${release.id}`)}
                value={`release ${release.version}`}
              >
                <Tag />
                <span className="font-mono">v{release.version}</span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {release.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
