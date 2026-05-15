"use client";

import { useActionState, useState } from "react";
import { Trash2, Webhook, Mail } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createNotificationEndpoint,
  deleteNotificationEndpoint,
  toggleNotificationEndpoint,
  type EndpointFormState,
} from "@/app/(app)/actions/notification-endpoints";

export type NotificationEndpointView = {
  id: string;
  kind: "webhook" | "email";
  target: string;
  enabled: boolean;
  event_filter: string[] | null;
  created_at: string;
  last_delivered_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
};

const EVENT_OPTIONS = [
  { value: "change_request.submitted", label: "CR submitted" },
  { value: "change_request.approved", label: "CR approved" },
  { value: "change_request.changes_requested", label: "Changes requested" },
  { value: "release.published", label: "Release published" },
];

export function NotificationEndpointsSection({
  endpoints,
  isAdmin,
}: {
  endpoints: NotificationEndpointView[];
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<EndpointFormState, FormData>(
    createNotificationEndpoint,
    null,
  );
  const [kind, setKind] = useState<"webhook" | "email">("webhook");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Notification endpoints
        </CardTitle>
        <CardDescription>
          Fan out CR and release events to webhooks or an email relay. Each
          notification is also written to the in-app inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {endpoints.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No endpoints configured yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {endpoints.map((e) => (
              <li
                key={e.id}
                className="border-border/60 flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0"
              >
                {e.kind === "webhook" ? (
                  <Webhook className="text-muted-foreground size-4" />
                ) : (
                  <Mail className="text-muted-foreground size-4" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-sm">{e.target}</span>
                  <span className="text-muted-foreground text-xs">
                    {e.event_filter && e.event_filter.length > 0
                      ? e.event_filter.join(", ")
                      : "all events"}
                    {e.last_delivered_at
                      ? ` · delivered ${formatWhen(e.last_delivered_at)}`
                      : ""}
                    {e.last_error
                      ? ` · last error: ${e.last_error}`
                      : ""}
                  </span>
                </div>
                <Badge
                  variant={e.enabled ? "default" : "outline"}
                  className="font-normal"
                >
                  {e.enabled ? "Enabled" : "Disabled"}
                </Badge>
                {isAdmin ? (
                  <div className="flex items-center gap-1">
                    <form action={toggleNotificationEndpoint}>
                      <input type="hidden" name="id" value={e.id} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={(!e.enabled).toString()}
                      />
                      <Button type="submit" size="sm" variant="ghost">
                        {e.enabled ? "Disable" : "Enable"}
                      </Button>
                    </form>
                    <form action={deleteNotificationEndpoint}>
                      <input type="hidden" name="id" value={e.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete endpoint"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? (
          <form action={action} className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Endpoint type</FieldLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={kind === "webhook" ? "default" : "outline"}
                    onClick={() => setKind("webhook")}
                  >
                    <Webhook data-icon="inline-start" />
                    Webhook
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={kind === "email" ? "default" : "outline"}
                    onClick={() => setKind("email")}
                  >
                    <Mail data-icon="inline-start" />
                    Email
                  </Button>
                  <input type="hidden" name="kind" value={kind} />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="target">
                  {kind === "webhook" ? "Webhook URL" : "Recipient email"}
                </FieldLabel>
                <Input
                  id="target"
                  name="target"
                  required
                  placeholder={
                    kind === "webhook"
                      ? "https://example.com/hooks/tokene"
                      : "design-system@example.com"
                  }
                />
                <FieldDescription>
                  {kind === "webhook"
                    ? "Tokene POSTs JSON to this URL for each matching event."
                    : "Mail is sent via the configured relay (NOTIFY_EMAIL_RELAY_URL)."}
                </FieldDescription>
              </Field>

              {kind === "webhook" ? (
                <Field>
                  <FieldLabel htmlFor="secret">
                    Signing secret{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="secret"
                    name="secret"
                    placeholder="A long random string"
                  />
                  <FieldDescription>
                    When set, payloads are signed with HMAC-SHA256 in the
                    <code className="mx-1 font-mono">x-tokene-signature</code>
                    header.
                  </FieldDescription>
                </Field>
              ) : null}

              <Field>
                <FieldLabel>Events</FieldLabel>
                <FieldDescription>
                  Leave all unchecked to receive every event.
                </FieldDescription>
                <div className="flex flex-col gap-2">
                  {EVENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox name="events" value={opt.value} />
                      <span className="font-mono">{opt.value}</span>
                      <span className="text-muted-foreground">
                        — {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>

              {state?.ok === false ? (
                <Alert variant="destructive">
                  <AlertTitle>Couldn&apos;t add endpoint</AlertTitle>
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  {pending ? "Adding…" : "Add endpoint"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
