"use client";

import { useActionState, useRef, useState } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
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
  parseImportAction,
  type ImportParseState,
} from "@/app/(app)/actions/imports";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportParseState, FormData>(
    parseImportAction,
    null,
  );
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setContent(text);
    };
    reader.readAsText(file);
  }

  return (
    <form action={action}>
      <input type="hidden" name="filename" value={filename} />
      <Card>
        <CardContent>
          <FieldGroup>
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
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending || !content.trim()}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? "Parsing…" : "Preview import"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
