"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  createTokenAction,
  type CreateTokenState,
} from "@/app/(app)/actions/tokens";

const types = [
  "color",
  "spacing",
  "sizing",
  "radius",
  "border_width",
  "typography",
  "shadow",
  "opacity",
  "z_index",
  "duration",
  "easing",
];

const levels = ["primitive", "semantic", "component"];

export function NewTokenForm() {
  const [state, action, pending] = useActionState<CreateTokenState, FormData>(
    createTokenAction,
    null,
  );

  const fieldErrors = new Map<string, string>();
  if (state && state.ok === false && state.issues) {
    for (const issue of state.issues) {
      if (issue.path && !fieldErrors.has(issue.path)) {
        fieldErrors.set(issue.path, issue.message);
      }
    }
  }

  return (
    <form action={action}>
      <Card>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={fieldErrors.has("name") || undefined}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="color.blue.600"
                className="font-mono"
                aria-invalid={fieldErrors.has("name") || undefined}
                required
              />
              <FieldDescription
                className={
                  fieldErrors.has("name") ? "text-destructive" : undefined
                }
              >
                {fieldErrors.get("name") ??
                  "Dotted lowercase path. Letters, digits, and dots only."}
              </FieldDescription>
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="type">Type</FieldLabel>
                <Select name="type" defaultValue="color">
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          <span className="capitalize">
                            {t.replace("_", " ")}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="level">Level</FieldLabel>
                <Select name="level" defaultValue="primitive">
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {levels.map((l) => (
                        <SelectItem key={l} value={l}>
                          <span className="capitalize">{l}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field data-invalid={fieldErrors.has("value") || undefined}>
              <FieldLabel htmlFor="value">Value</FieldLabel>
              <Input
                id="value"
                name="value"
                placeholder="#005FCC  or  {color.blue.600}"
                className="font-mono"
                aria-invalid={fieldErrors.has("value") || undefined}
                required
              />
              <FieldDescription
                className={
                  fieldErrors.has("value") ? "text-destructive" : undefined
                }
              >
                {fieldErrors.get("value") ??
                  "Literal value (e.g. #005FCC, 16px, 150ms) or a reference (e.g. {color.blue.600})."}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="description">
                Description{" "}
                <span className="text-muted-foreground">(recommended)</span>
              </FieldLabel>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="When should engineers reach for this token?"
              />
            </Field>

            {state?.ok === false && !state.issues?.length ? (
              <Alert variant="destructive">
                <AlertTitle>Could not create token</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Creating…" : "Create draft"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
