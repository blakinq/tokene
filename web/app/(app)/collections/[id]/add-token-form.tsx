"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TokenStatusBadge } from "@/components/status-badge";

import { addTokenToCollection } from "@/app/(app)/actions/collections";

export type AddCandidate = {
  id: string;
  name: string;
  type: string;
  level: string;
  status: "draft" | "in_review" | "approved" | "published" | "deprecated" | "archived";
};

export function AddTokenForm({
  collectionId,
  candidates,
}: {
  collectionId: string;
  candidates: AddCandidate[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates.slice(0, 50);
    return candidates
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [candidates, query]);

  if (candidates.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Plus data-icon="inline-start" />
        All tokens added
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" />
          Add token
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <Input
          placeholder="Search tokens…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
          autoFocus
        />
        <ul className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-2 py-4 text-center text-xs">
              No matches.
            </li>
          ) : null}
          {filtered.map((t) => (
            <li key={t.id}>
              <form
                action={async (formData) => {
                  await addTokenToCollection(formData);
                  setOpen(false);
                }}
              >
                <input type="hidden" name="collectionId" value={collectionId} />
                <input type="hidden" name="tokenId" value={t.id} />
                <button
                  type="submit"
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                >
                  <span className="truncate font-mono">{t.name}</span>
                  <TokenStatusBadge status={t.status} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
