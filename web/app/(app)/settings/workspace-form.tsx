"use client";

import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import {
  updateWorkspaceAction,
  type UpdateWorkspaceState,
} from "@/app/(app)/actions/workspace";

export function WorkspaceForm({
  initialName,
  initialProduct,
  disabled,
}: {
  initialName: string;
  initialProduct: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<UpdateWorkspaceState, FormData>(
    updateWorkspaceAction,
    null,
  );

  return (
    <form action={action}>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ws-name">Name</FieldLabel>
            <Input
              id="ws-name"
              name="name"
              defaultValue={initialName}
              disabled={disabled}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ws-product">Product</FieldLabel>
            <Input
              id="ws-product"
              name="product"
              defaultValue={initialProduct}
              disabled={disabled}
            />
          </Field>

          {state?.ok === false ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state?.ok ? (
            <Alert>
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>Workspace profile updated.</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={disabled || pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </form>
  );
}
