"use client";

import { useActionState, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { TokenStatusBadge } from "@/components/status-badge";

import {
  createCollectionAction,
  type CreateCollectionState,
} from "@/app/(app)/actions/collections";

export type CollectionCandidate = {
  id: string;
  name: string;
  type: string;
  level: string;
  status: "draft" | "in_review" | "approved" | "published" | "deprecated" | "archived";
};

export function NewCollectionForm({
  candidates,
}: {
  candidates: CollectionCandidate[];
}) {
  const [state, action, pending] = useActionState<CreateCollectionState, FormData>(
    createCollectionAction,
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q),
    );
  }, [candidates, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={action}>
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                required
                placeholder="Marketing surfaces"
              />
              <FieldDescription>
                Used as the display name. A URL slug is generated automatically.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Tokens used on the marketing site only."
              />
            </Field>

            <Field>
              <FieldLabel>Add tokens</FieldLabel>
              <FieldDescription>
                Pick the tokens this collection should group. You can add more
                later from the detail page.
              </FieldDescription>
              <Input
                placeholder="Filter by name or type…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-2"
              />
              {candidates.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
                  No tokens yet. Create some tokens first.
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto rounded-md border">
                  {filtered.map((t) => (
                    <li
                      key={t.id}
                      className="border-border/60 flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <Checkbox
                        id={`c-${t.id}`}
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggle(t.id)}
                      />
                      {selected.has(t.id) ? (
                        <input type="hidden" name="tokenIds" value={t.id} />
                      ) : null}
                      <label
                        htmlFor={`c-${t.id}`}
                        className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                      >
                        <span className="font-mono">{t.name}</span>
                        <span className="text-muted-foreground text-xs capitalize">
                          {t.type.replace("_", " ")} · {t.level}
                        </span>
                      </label>
                      <TokenStatusBadge status={t.status} />
                    </li>
                  ))}
                  {filtered.length === 0 ? (
                    <li className="text-muted-foreground px-3 py-4 text-center text-xs">
                      No tokens match.
                    </li>
                  ) : null}
                </ul>
              )}
              {selected.size > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {selected.size} selected
                </p>
              ) : null}
            </Field>

            {state?.ok === false ? (
              <Alert variant="destructive">
                <AlertTitle>Could not create collection</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Creating…" : "Create collection"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
