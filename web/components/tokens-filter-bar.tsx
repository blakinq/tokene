"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TokenLevel, TokenStatus, TokenType } from "@/lib/supabase/types";

const typeOptions: { value: TokenType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "color", label: "Color" },
  { value: "spacing", label: "Spacing" },
  { value: "sizing", label: "Sizing" },
  { value: "radius", label: "Radius" },
  { value: "border_width", label: "Border width" },
  { value: "typography", label: "Typography" },
  { value: "shadow", label: "Shadow" },
  { value: "opacity", label: "Opacity" },
  { value: "z_index", label: "Z-index" },
  { value: "duration", label: "Duration" },
  { value: "easing", label: "Easing" },
];

const levelOptions: { value: TokenLevel | "all"; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "primitive", label: "Primitive" },
  { value: "semantic", label: "Semantic" },
  { value: "component", label: "Component" },
];

const statusOptions: { value: TokenStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "deprecated", label: "Deprecated" },
  { value: "archived", label: "Archived" },
];

export function TokensFilterBar({
  initialQuery,
  initialType,
  initialLevel,
  initialStatus,
  initialTag,
}: {
  initialQuery: string;
  initialType: TokenType | null;
  initialLevel: TokenLevel | null;
  initialStatus: TokenStatus | null;
  initialTag: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<string>(initialType ?? "all");
  const [level, setLevel] = useState<string>(initialLevel ?? "all");
  const [status, setStatus] = useState<string>(initialStatus ?? "all");
  const [tag, setTag] = useState(initialTag ?? "");

  const apply = (next: {
    query?: string;
    type?: string;
    level?: string;
    status?: string;
    tag?: string;
  }) => {
    const params = new URLSearchParams();
    const q = (next.query ?? query).trim();
    const t = next.type ?? type;
    const l = next.level ?? level;
    const s = next.status ?? status;
    const tg = (next.tag ?? tag).trim();
    if (q) params.set("q", q);
    if (t !== "all") params.set("type", t);
    if (l !== "all") params.set("level", l);
    if (s !== "all") params.set("status", s);
    if (tg) params.set("tag", tg);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/tokens?${qs}` : "/tokens"));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <InputGroup className="max-w-sm">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      <Select
        value={type}
        onValueChange={(v) => {
          setType(v);
          apply({ type: v });
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={level}
        onValueChange={(v) => {
          setLevel(v);
          apply({ level: v });
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {levelOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          apply({ status: v });
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Input
        placeholder="tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="h-9 w-24 font-mono text-xs"
      />
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  );
}
