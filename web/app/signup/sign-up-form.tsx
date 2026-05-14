"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { signUp, type SignUpState } from "./actions";

export function SignUpForm({
  inviteToken,
  defaultEmail,
}: {
  inviteToken?: string;
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(
    signUp,
    null,
  );
  const [showPassword, setShowPassword] = useState(false);

  const invalid = state?.ok === false;

  if (state?.ok && state.needsConfirmation) {
    return (
      <Alert>
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          We sent a confirmation link. Open it to finish creating your account,
          then sign in.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="displayName">Name</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
          />
        </Field>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaultEmail ?? ""}
            readOnly={Boolean(defaultEmail)}
            aria-invalid={invalid || undefined}
          />
        </Field>
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={invalid || undefined}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex items-center pr-3 focus-visible:ring-2 focus-visible:outline-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <FieldDescription>At least 8 characters.</FieldDescription>
          {state?.ok === false ? (
            <FieldDescription className="text-destructive">
              {state.error}
            </FieldDescription>
          ) : null}
        </Field>

        {inviteToken ? (
          <input type="hidden" name="inviteToken" value={inviteToken} />
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-muted-foreground text-center text-xs">
          Already have an account?{" "}
          <Link
            href={
              inviteToken
                ? `/login?invite=${encodeURIComponent(inviteToken)}`
                : "/login"
            }
            className="hover:text-foreground underline"
          >
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
