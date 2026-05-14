"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { revokeInviteAction } from "@/app/(app)/actions/invites";

export function RevokeInviteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => revokeInviteAction(formData));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Revoke
      </Button>
    </form>
  );
}
