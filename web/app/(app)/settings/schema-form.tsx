"use client";

import { useActionState } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  updateSchemaConfigAction,
  type SchemaConfigState,
} from "@/app/(app)/actions/schema-config";
import type { WorkspaceSchemaConfig } from "@/lib/supabase/schema-config";

const ALL_TYPES = [
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

const ALL_REQUIRED = [
  { value: "name", description: "Always required." },
  { value: "type", description: "Always required." },
  { value: "value", description: "Block save without a value." },
  { value: "description", description: "Force every token to have usage guidance." },
  { value: "tags", description: "Require at least one tag." },
];

export function SchemaForm({
  initial,
  disabled,
}: {
  initial: WorkspaceSchemaConfig;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState<SchemaConfigState, FormData>(
    updateSchemaConfigAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Naming + types</CardTitle>
          <CardDescription>
            Validation runs against these on token create, change-request
            approval, and import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="namingPattern">Naming pattern</FieldLabel>
              <Input
                id="namingPattern"
                name="namingPattern"
                defaultValue={initial.namingPattern}
                className="font-mono text-xs"
                disabled={disabled}
              />
              <FieldDescription>
                Regular expression. Default matches dotted lowercase paths like{" "}
                <span className="font-mono">color.blue.600</span>.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Allowed token types</FieldLabel>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {ALL_TYPES.map((t) => (
                  <label
                    key={t}
                    className="hover:bg-accent/30 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                  >
                    <Checkbox
                      name="allowedTokenTypes"
                      value={t}
                      defaultChecked={initial.allowedTokenTypes.includes(
                        t as never,
                      )}
                      disabled={disabled}
                    />
                    <span className="capitalize">{t.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel>Required fields</FieldLabel>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {ALL_REQUIRED.map((r) => (
                  <label
                    key={r.value}
                    className="hover:bg-accent/30 flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      name="requiredFields"
                      value={r.value}
                      defaultChecked={initial.requiredFields.includes(r.value)}
                      disabled={disabled || r.value === "name" || r.value === "type"}
                    />
                    <span className="flex flex-col">
                      <span className="capitalize">{r.value}</span>
                      <span className="text-muted-foreground text-xs">
                        {r.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Approval rules</CardTitle>
          <CardDescription>
            Govern how change requests reach the approved state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="minApprovalCount">
                Minimum approvals
              </FieldLabel>
              <Input
                id="minApprovalCount"
                name="minApprovalCount"
                type="number"
                min={1}
                max={10}
                defaultValue={initial.minApprovalCount}
                disabled={disabled}
                className="w-32"
              />
              <FieldDescription>
                Distinct reviewers required before a change request flips to
                approved.
              </FieldDescription>
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <FieldLabel htmlFor="allowSelfApproval">
                    Allow authors to approve themselves
                  </FieldLabel>
                  <span className="text-muted-foreground text-xs">
                    Off by default — separation of duties.
                  </span>
                </div>
                <Switch
                  id="allowSelfApproval"
                  name="allowSelfApproval"
                  defaultChecked={initial.allowSelfApproval}
                  disabled={disabled}
                />
              </div>
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <FieldLabel htmlFor="requireAdminForBreaking">
                    Require admin approval for breaking changes
                  </FieldLabel>
                  <span className="text-muted-foreground text-xs">
                    A reviewer can approve, but an admin must also sign off when
                    the change is breaking.
                  </span>
                </div>
                <Switch
                  id="requireAdminForBreaking"
                  name="requireAdminForBreaking"
                  defaultChecked={initial.requireAdminForBreaking}
                  disabled={disabled}
                />
              </div>
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <FieldLabel htmlFor="requireMigrationNotesForBreaking">
                    Require migration notes on breaking changes
                  </FieldLabel>
                  <span className="text-muted-foreground text-xs">
                    Block approval until the author writes migration notes.
                  </span>
                </div>
                <Switch
                  id="requireMigrationNotesForBreaking"
                  name="requireMigrationNotesForBreaking"
                  defaultChecked={initial.requireMigrationNotesForBreaking}
                  disabled={disabled}
                />
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {state?.ok === false ? (
        <Alert variant="destructive">
          <AlertTitle>{state.error}</AlertTitle>
        </Alert>
      ) : null}
      {state?.ok ? (
        <Alert>
          <AlertTitle>Saved.</AlertTitle>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Save settings
        </Button>
      </div>
    </form>
  );
}
