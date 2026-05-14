"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { signIn } from "./actions";

type State = { error?: string } | null;

export function SignInForm() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    signIn,
    null,
  );

  const invalid = Boolean(state?.error);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={invalid || undefined}
          />
        </Field>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={invalid || undefined}
          />
          {state?.error ? (
            <FieldDescription className="text-destructive">
              {state.error}
            </FieldDescription>
          ) : null}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
