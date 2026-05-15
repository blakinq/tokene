"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColorSwatch } from "@/components/color-swatch";
import { TokenStatusBadge } from "@/components/status-badge";
import { formatRelativeDate } from "@/lib/mock-data";
import type {
  TokenLevel,
  TokenStatus,
  TokenType,
} from "@/lib/supabase/types";

export type TokenRow = {
  id: string;
  name: string;
  type: TokenType;
  level: TokenLevel;
  status: TokenStatus;
  current_value: string | null;
  current_resolved_value: string | null;
  deprecated: boolean;
  tags: string[];
  updated_at: string;
};

// Map DB status enum → existing TokenStatusBadge type.
const dbStatusToBadge: Record<
  TokenStatus,
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "deprecated"
  | "archived"
> = {
  draft: "draft",
  in_review: "in_review",
  approved: "approved",
  published: "published",
  deprecated: "deprecated",
  archived: "archived",
};

export function TokensTable({
  tokens,
  totalCount,
  nextCursor,
  currentCursor,
}: {
  tokens: TokenRow[];
  totalCount: number;
  nextCursor: string | null;
  currentCursor: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[36%]">Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Level</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden xl:table-cell">Updated</TableHead>
              <TableHead className="w-10" aria-label="" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No tokens match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
            {tokens.map((token) => (
              <TableRow key={token.id} className="group">
                <TableCell>
                  <Link
                    href={`/tokens/${token.id}`}
                    className="hover:text-foreground text-foreground font-mono text-[13px] tracking-tight"
                  >
                    {token.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {token.type === "color" && token.current_resolved_value ? (
                      <ColorSwatch value={token.current_resolved_value} />
                    ) : null}
                    <span className="text-muted-foreground font-mono text-xs">
                      {token.current_value ?? "—"}
                    </span>
                    {token.current_value !== token.current_resolved_value &&
                    token.current_resolved_value ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground/70 font-mono text-xs">
                            · {token.current_resolved_value}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Resolved value</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-muted-foreground text-xs capitalize">
                    {token.type.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline" className="font-normal capitalize">
                    {token.level}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <TokenStatusBadge status={dbStatusToBadge[token.status]} />
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <span className="text-muted-foreground text-xs">
                    {formatRelativeDate(token.updated_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Link
                      href={`/tokens/${token.id}`}
                      aria-label={`Open ${token.name}`}
                    >
                      <ArrowRight />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          Showing{" "}
          <span className="text-foreground font-medium">{tokens.length}</span>{" "}
          loaded
          {totalCount > tokens.length ? (
            <>
              {" "}· <span className="font-medium">{totalCount}</span> total
            </>
          ) : null}
        </span>
        <div className="flex items-center gap-1">
          {currentCursor ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tokens">First page</Link>
            </Button>
          ) : null}
          {nextCursor ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tokens?cursor=${encodeURIComponent(nextCursor)}`}>
                Load more
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
