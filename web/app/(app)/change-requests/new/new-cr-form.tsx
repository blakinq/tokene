"use client";

import { useActionState, useState } from "react";

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
  createBlankChangeRequest,
  type NewCRState,
} from "@/app/(app)/actions/change-requests";

export type CandidateToken = {
  id: string;
  name: string;
  type: string;
  level: string;
  status: "draft" | "in_review" | "approved" | "published" | "deprecated" | "archived";
  current_value: string | null;
};

export function NewCRForm({ candidates }: { candidates: CandidateToken[] }) {
  const [state, action, pending] = useActionState<NewCRState, FormData>(
    createBlankChangeRequest,
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                name="title"
                required
                placeholder="Promote button hover token"
              />
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
                placeholder="What does this change request do, and why?"
              />
            </Field>

            <Field>
              <FieldLabel>Attach draft tokens</FieldLabel>
              <FieldDescription>
                Pick any draft tokens to include in this CR. You can also leave
                this empty and attach changes from token detail pages later.
              </FieldDescription>
              {candidates.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
                  No draft tokens yet. Create a draft token first to attach it
                  here.
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto rounded-md border">
                  {candidates.map((t) => (
                    <li
                      key={t.id}
                      className="border-border/60 flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <Checkbox
                        id={`tok-${t.id}`}
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggle(t.id)}
                      />
                      {selected.has(t.id) ? (
                        <input
                          type="hidden"
                          name="tokenIds"
                          value={t.id}
                        />
                      ) : null}
                      <label
                        htmlFor={`tok-${t.id}`}
                        className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                      >
                        <span className="font-mono">{t.name}</span>
                        <TokenStatusBadge status={t.status} />
                      </label>
                      <span className="text-muted-foreground font-mono text-xs">
                        {t.current_value ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            {state?.ok === false ? (
              <Alert variant="destructive">
                <AlertTitle>Could not create change request</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Creating…" : "Create change request"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
