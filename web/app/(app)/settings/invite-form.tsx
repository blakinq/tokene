"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import {
  createInviteAction,
  type CreateInviteState,
} from "@/app/(app)/actions/invites";

export function InviteForm() {
  const [state, action, pending] = useActionState<CreateInviteState, FormData>(
    createInviteAction,
    null,
  );
  const [copied, setCopied] = useState(false);

  // Remount the form fields after each successful submission so the email
  // input clears and the Select returns to its default. Keying on state
  // (rather than effect+setState) avoids a redundant render pass.
  const fieldsKey = state?.ok ? state.url : "initial";

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts. The link is still
      // visible in the input for the user to copy manually.
    }
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup key={fieldsKey}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field>
            <FieldLabel htmlFor="invite-email">Email</FieldLabel>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="teammate@company.com"
              autoComplete="off"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-role">Role</FieldLabel>
            <Select name="role" defaultValue="contributor">
              <SelectTrigger id="invite-role" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Creating…" : "Create invite"}
          </Button>
        </div>
      </FieldGroup>

      {state?.ok === false ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t create invite</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state?.ok ? (
        <Alert>
          <AlertTitle>Invite link ready</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span className="text-muted-foreground">
              Share this with{" "}
              <span className="text-foreground font-medium">{state.email}</span>
              . It expires in 14 days.
            </span>
            <div className="flex gap-2">
              <Input
                readOnly
                value={state.url}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copy(state.url)}
              >
                {copied ? (
                  <Check className="size-3" aria-hidden />
                ) : (
                  <Copy className="size-3" aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
