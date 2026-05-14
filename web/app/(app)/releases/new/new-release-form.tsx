"use client";

import { useState } from "react";

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
import { ChangeRequestStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

import { publishReleaseFromCRs } from "@/app/(app)/actions/releases";

export type ApprovedCR = {
  id: string;
  short_id: string;
  title: string;
  breaking: boolean;
  items: { id: string }[];
};

export function NewReleaseForm({
  approved,
  idempotencyKey,
}: {
  approved: ApprovedCR[];
  idempotencyKey: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(approved.map((c) => c.id)),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={publishReleaseFromCRs}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="version">Version</FieldLabel>
              <Input
                id="version"
                name="version"
                placeholder="2.4.0"
                className="font-mono"
                required
              />
              <FieldDescription>Semver. Workspace-unique.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="summary">
                Changelog summary{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="summary"
                name="summary"
                placeholder="What does this release do?"
              />
            </Field>

            <Field>
              <FieldLabel>Approved change requests</FieldLabel>
              <FieldDescription>
                Every selected change request will be marked published and its
                tokens snapshot into this release.
              </FieldDescription>
              {approved.length === 0 ? (
                <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-xs">
                  No approved change requests. Approve a CR before drafting a
                  release.
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto rounded-md border">
                  {approved.map((cr) => (
                    <li
                      key={cr.id}
                      className="border-border/60 flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <Checkbox
                        id={`cr-${cr.id}`}
                        checked={selected.has(cr.id)}
                        onCheckedChange={() => toggle(cr.id)}
                      />
                      {selected.has(cr.id) ? (
                        <input
                          type="hidden"
                          name="changeRequestIds"
                          value={cr.id}
                        />
                      ) : null}
                      <label
                        htmlFor={`cr-${cr.id}`}
                        className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                      >
                        <span className="text-muted-foreground font-mono text-xs">
                          {cr.short_id}
                        </span>
                        <span className="truncate">{cr.title}</span>
                      </label>
                      <ChangeRequestStatusBadge status="approved" />
                      {cr.breaking ? (
                        <Badge variant="destructive" className="font-normal">
                          Breaking
                        </Badge>
                      ) : null}
                      <span className="text-muted-foreground font-mono text-xs">
                        {cr.items.length}{" "}
                        {cr.items.length === 1 ? "change" : "changes"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={selected.size === 0 || approved.length === 0}
              >
                Publish release
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
