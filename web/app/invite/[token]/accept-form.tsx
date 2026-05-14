"use client";

import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { acceptInviteAction, type AcceptInviteState } from "./actions";

export function AcceptInviteForm({
  token,
  workspaceName,
  role,
}: {
  token: string;
  workspaceName: string;
  role: string;
}) {
  const [state, action, pending] = useActionState<AcceptInviteState, FormData>(
    acceptInviteAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-muted-foreground text-sm">
        Accepting will add you to{" "}
        <span className="text-foreground font-medium">{workspaceName}</span> as
        a <span className="text-foreground capitalize">{role}</span>.
      </p>
      {state?.ok === false ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t accept</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {pending ? "Joining…" : "Accept invite"}
      </Button>
    </form>
  );
}
