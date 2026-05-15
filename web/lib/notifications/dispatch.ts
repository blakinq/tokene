import "server-only";

import { createHmac } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type DispatchPayload = {
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  entityType: string;
  entityId?: string | null;
};

type EndpointRow = {
  id: string;
  kind: "webhook" | "email";
  target: string;
  secret: string | null;
  event_filter: string[] | null;
  enabled: boolean;
};

/**
 * Fan-out to workspace-configured webhook/email endpoints. Runs fire-and-forget
 * so a slow webhook never blocks a server action — the caller awaits the
 * Promise<void> so Next can finish the request, but every delivery has its own
 * timeout and the helper swallows individual failures (and records them).
 *
 * Uses the service-role client so failures from other workspaces' endpoints
 * can be written to `notification_endpoints.last_error` without RLS friction.
 */
export async function dispatchExternalNotifications(
  workspaceId: string,
  payload: DispatchPayload,
): Promise<void> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("notification_endpoints")
    .select("id, kind, target, secret, event_filter, enabled")
    .eq("workspace_id", workspaceId)
    .eq("enabled", true);

  if (error || !data) return;
  const endpoints = data as EndpointRow[];

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const fullLink = payload.link ? `${origin}${payload.link}` : null;

  await Promise.all(
    endpoints.map(async (ep) => {
      if (
        ep.event_filter &&
        ep.event_filter.length > 0 &&
        !ep.event_filter.includes(payload.kind)
      ) {
        return;
      }
      try {
        if (ep.kind === "webhook") {
          await deliverWebhook(ep, payload, fullLink);
        } else {
          await deliverEmail(ep, payload, fullLink);
        }
        await service.rpc("record_endpoint_delivery", {
          endpoint_id: ep.id,
          ok: true,
        } as never);
      } catch (err) {
        await service.rpc("record_endpoint_delivery", {
          endpoint_id: ep.id,
          ok: false,
          err: err instanceof Error ? err.message : String(err),
        } as never);
      }
    }),
  );
}

async function deliverWebhook(
  ep: EndpointRow,
  payload: DispatchPayload,
  fullLink: string | null,
): Promise<void> {
  const body = JSON.stringify({
    kind: payload.kind,
    title: payload.title,
    body: payload.body ?? null,
    link: fullLink,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    sent_at: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "tokene-webhook/1.0",
  };
  if (ep.secret) {
    const sig = createHmac("sha256", ep.secret).update(body).digest("hex");
    headers["x-tokene-signature"] = `sha256=${sig}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(ep.target, {
      method: "POST",
      body,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Email delivery is intentionally provider-agnostic: it POSTs the payload to
 * the configured email-relay URL (e.g. a Resend / Sendgrid bridge or any
 * server endpoint the workspace controls). The `target` column doubles as the
 * recipient address — the relay decides how to deliver it.
 *
 * The relay URL is read from `NOTIFY_EMAIL_RELAY_URL`. If unset, email
 * endpoints are skipped so we don't silently swallow undelivered mail.
 */
async function deliverEmail(
  ep: EndpointRow,
  payload: DispatchPayload,
  fullLink: string | null,
): Promise<void> {
  const relay = process.env.NOTIFY_EMAIL_RELAY_URL;
  if (!relay) {
    throw new Error("Email relay not configured (NOTIFY_EMAIL_RELAY_URL).");
  }
  const body = JSON.stringify({
    to: ep.target,
    subject: payload.title,
    text: [payload.body, fullLink].filter(Boolean).join("\n\n"),
    kind: payload.kind,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
  });
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (process.env.NOTIFY_EMAIL_RELAY_TOKEN) {
    headers["authorization"] = `Bearer ${process.env.NOTIFY_EMAIL_RELAY_TOKEN}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(relay, {
      method: "POST",
      body,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
