"use client";

import { useActionState, useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  createApiKeyAction,
  revokeApiKeyAction,
  type CreateApiKeyState,
} from "@/app/(app)/actions/api-keys";

export type ApiKeyView = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const SCOPES: { value: string; label: string; description: string }[] = [
  {
    value: "tokens:read",
    label: "tokens:read",
    description: "Read token metadata.",
  },
  {
    value: "releases:read",
    label: "releases:read",
    description: "Read published releases.",
  },
  {
    value: "exports:create",
    label: "exports:create",
    description: "Generate exports against a release.",
  },
  {
    value: "changelog:read",
    label: "changelog:read",
    description: "Read changelog entries.",
  },
];

export function ApiKeysSection({
  keys,
  isAdmin,
}: {
  keys: ApiKeyView[];
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<
    CreateApiKeyState,
    FormData
  >(createApiKeyAction, null);
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Create an API key
            </CardTitle>
            <CardDescription>
              Use API keys to fetch exports from CI or a token consumer.
              Tokens are shown only once; store them in your secret manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    placeholder="GitHub Actions · staging"
                    required
                  />
                  <FieldDescription>
                    A human label so you remember what is using it.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Scopes</FieldLabel>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {SCOPES.map((s) => (
                      <label
                        key={s.value}
                        className="hover:bg-accent/30 flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <Checkbox
                          name="scopes"
                          value={s.value}
                          defaultChecked={
                            s.value === "exports:create" ||
                            s.value === "releases:read"
                          }
                        />
                        <span className="flex flex-col">
                          <span className="font-mono text-xs">{s.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {s.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>
              </FieldGroup>

              {state?.ok === false ? (
                <Alert variant="destructive">
                  <AlertTitle>{state.error}</AlertTitle>
                </Alert>
              ) : null}

              {state?.ok ? (
                <Alert>
                  <AlertTitle>
                    Key created · {state.name} ({state.prefix})
                  </AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      Copy the token now — it will not be shown again.
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted flex-1 rounded-md px-2 py-1.5 text-xs break-all">
                        {state.plaintext}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copy(state.plaintext)}
                      >
                        <Copy data-icon="inline-start" />
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  <KeyRound data-icon="inline-start" />
                  Generate key
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Active keys
            <span className="text-muted-foreground ml-2 font-mono text-sm">
              {keys.filter((k) => !k.revoked_at).length}
            </span>
          </CardTitle>
          <CardDescription>
            Revoked keys stay listed for audit purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No API keys yet.
            </p>
          ) : (
            <ul className="flex flex-col">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="border-border/60 flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{k.name}</span>
                      <code className="text-muted-foreground text-xs">
                        {k.prefix}…
                      </code>
                      {k.revoked_at ? (
                        <Badge
                          variant="outline"
                          className="font-normal text-xs"
                        >
                          revoked
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      Created{" "}
                      {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at ? (
                        <>
                          {" · last used "}
                          {new Date(k.last_used_at).toLocaleDateString()}
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="font-mono text-[10px] font-normal"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {isAdmin && !k.revoked_at ? (
                    <form action={revokeApiKeyAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 data-icon="inline-start" />
                        Revoke
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
