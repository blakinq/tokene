"use client";

import { useActionState, useRef, useState } from "react";

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

import {
  importTokensAction,
  type ImportState,
} from "@/app/(app)/actions/imports";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(
    importTokensAction,
    null,
  );
  const [content, setContent] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setContent(text);
    };
    reader.readAsText(file);
  }

  return (
    <form action={action}>
      <Card>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">
                Change request title{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="title"
                name="title"
                placeholder="Import from marketing-tokens.json"
              />
            </Field>

            <Field>
              <FieldLabel>Upload a JSON file</FieldLabel>
              <Input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={onFile}
              />
              <FieldDescription>
                Loads the contents into the textarea below. Nothing is uploaded
                to the server until you submit.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="content">Or paste JSON</FieldLabel>
              <Textarea
                id="content"
                name="content"
                rows={14}
                placeholder={`{
  "color.blue.600": "#005FCC",
  "color.background.brand": "{color.blue.600}"
}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-xs"
                required
              />
              <FieldDescription>
                Accepts a flat <span className="font-mono">{`{name: value}`}</span>{" "}
                map or a Style Dictionary-style nested object.
              </FieldDescription>
            </Field>

            {state?.ok === false ? (
              <Alert variant="destructive">
                <AlertTitle>{state.error}</AlertTitle>
                {state.issues?.length ? (
                  <AlertDescription>
                    <ul className="mt-1 list-disc pl-4">
                      {state.issues.slice(0, 6).map((i, idx) => (
                        <li key={`${i.token}-${idx}`}>
                          <span className="font-mono">{i.token}</span>:{" "}
                          {i.message}
                        </li>
                      ))}
                      {state.issues.length > 6 ? (
                        <li>+ {state.issues.length - 6} more</li>
                      ) : null}
                    </ul>
                  </AlertDescription>
                ) : null}
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending || !content.trim()}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Parsing…" : "Create change request"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
