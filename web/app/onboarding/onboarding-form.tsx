"use client";

import { useActionState } from "react";

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

import {
  createWorkspaceAction,
  type CreateWorkspaceState,
} from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<
    CreateWorkspaceState,
    FormData
  >(createWorkspaceAction, null);

  return (
    <form action={action}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Workspace name</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Acme"
            autoComplete="organization"
            required
          />
          <FieldDescription>
            Your team or company. Visible to every member.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="product">
            Product{" "}
            <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input id="product" name="product" placeholder="Core" />
          <FieldDescription>
            A label to disambiguate workspaces, e.g. <span className="font-mono">Core</span>.
          </FieldDescription>
        </Field>

        {state?.ok === false ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create workspace</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Creating…" : "Create workspace"}
        </Button>
      </FieldGroup>
    </form>
  );
}
