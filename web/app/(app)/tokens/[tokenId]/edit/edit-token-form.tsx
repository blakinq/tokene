"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

import { ValueEditor } from "@/app/(app)/tokens/new/value-editor";
import {
  createEditCRForToken,
  type EditTokenCRState,
} from "@/app/(app)/actions/change-requests";

export function EditTokenForm({
  tokenId,
  tokenName,
  tokenType,
  tokenStatus,
  currentValue,
}: {
  tokenId: string;
  tokenName: string;
  tokenType: string;
  tokenStatus: string;
  currentValue: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<EditTokenCRState, FormData>(
    createEditCRForToken,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.push(`/change-requests/${state.crId}`);
  }, [state, router]);

  const fieldErrors = new Map<string, string>();
  if (state && state.ok === false && state.issues) {
    for (const issue of state.issues) {
      if (issue.path && !fieldErrors.has(issue.path)) {
        fieldErrors.set(issue.path, issue.message);
      }
    }
  }

  const canEdit = tokenStatus === "published" || tokenStatus === "deprecated";

  return (
    <form action={action}>
      <input type="hidden" name="tokenId" value={tokenId} />
      <Card>
        <CardContent>
          <FieldGroup>
            {!canEdit ? (
              <Alert variant="destructive">
                <AlertTitle>This token can&apos;t be edited here</AlertTitle>
                <AlertDescription>
                  Only published or deprecated tokens go through the edit flow.
                  Draft tokens can be attached directly to a change request.
                </AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel>Current value</FieldLabel>
              <div className="bg-muted/40 rounded-md p-3 font-mono text-sm">
                {currentValue || "—"}
              </div>
              <FieldDescription>
                What the latest published release exports today.
              </FieldDescription>
            </Field>

            <Field data-invalid={fieldErrors.has("value") || undefined}>
              <FieldLabel>New value</FieldLabel>
              <ValueEditor
                type={tokenType}
                invalid={fieldErrors.has("value")}
                initialValue={currentValue}
                lockType
              />
              <FieldDescription
                className={
                  fieldErrors.has("value") ? "text-destructive" : undefined
                }
              >
                {fieldErrors.get("value") ??
                  `Proposed replacement for ${tokenName}.`}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="title">
                CR title{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="title"
                name="title"
                placeholder={`Edit ${tokenName}`}
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
                placeholder="Why this change?"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="migrationNotes">
                Migration notes{" "}
                <span className="text-muted-foreground">
                  (required for breaking edits)
                </span>
              </FieldLabel>
              <Textarea
                id="migrationNotes"
                name="migrationNotes"
                rows={3}
                placeholder="What downstream consumers need to know."
              />
            </Field>

            {state?.ok === false && !state.issues?.length ? (
              <Alert variant="destructive">
                <AlertTitle>Could not open change request</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending || !canEdit}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Opening CR…" : "Open change request"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
