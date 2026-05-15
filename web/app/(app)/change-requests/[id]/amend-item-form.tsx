"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ValueEditor } from "@/app/(app)/tokens/new/value-editor";
import { updateChangeRequestItemValue } from "@/app/(app)/actions/change-requests";

export function AmendItemForm({
  itemId,
  changeRequestId,
  tokenType,
  currentAfter,
}: {
  itemId: string;
  changeRequestId: string;
  tokenType: string;
  currentAfter: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start text-xs underline-offset-2 hover:underline"
      >
        <Pencil className="size-3" />
        Amend value
      </button>
    );
  }

  return (
    <form
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          try {
            await updateChangeRequestItemValue(formData);
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        });
      }}
      className="border-border/60 flex flex-col gap-3 rounded-md border bg-background p-3"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="changeRequestId" value={changeRequestId} />
      <ValueEditor
        type={tokenType}
        initialValue={currentAfter}
        lockType
        invalid={!!error}
      />
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          <X data-icon="inline-start" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save value"}
        </Button>
      </div>
    </form>
  );
}
