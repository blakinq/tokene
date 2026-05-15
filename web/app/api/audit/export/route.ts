import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { loadProfiles, formatActorName } from "@/lib/supabase/profiles";

const SINCE_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
};

export async function GET(req: Request) {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const actor = url.searchParams.get("actor");
  const action = url.searchParams.get("action");
  const entity = url.searchParams.get("entity");
  const since = url.searchParams.get("since");
  const q = url.searchParams.get("q");

  if (format !== "csv" && format !== "json") {
    return new Response("Unsupported format. Use csv or json.", {
      status: 400,
    });
  }

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_id, created_at")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (actor && actor !== "all") query = query.eq("actor_id", actor);
  if (action && action !== "all") query = query.eq("action", action);
  if (entity && entity !== "all") query = query.eq("entity_type", entity);
  if (since && SINCE_HOURS[since]) {
    const cutoff = new Date(
      Date.now() - SINCE_HOURS[since] * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte("created_at", cutoff);
  }
  if (q) query = query.ilike("entity_id", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return new Response(`Audit query failed: ${error.message}`, {
      status: 500,
    });
  }

  const rows = (data ?? []) as AuditRow[];
  const profilesById = await loadProfiles(
    supabase,
    rows.map((r) => r.actor_id),
  );

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "audit.exported",
    p_entity_type: "AuditLog",
    p_after: { format, count: rows.length },
  } as never);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (format === "json") {
    const body = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        workspace_id: workspace.workspaceId,
        count: rows.length,
        filters: { actor, action, entity, since, q },
        entries: rows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          actor_id: r.actor_id,
          actor_name: r.actor_id
            ? formatActorName(profilesById.get(r.actor_id), "System")
            : "System",
          action: r.action,
          entity_type: r.entity_type,
          entity_id: r.entity_id,
        })),
      },
      null,
      2,
    );
    return new Response(body, {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="audit-${stamp}.json"`,
        "cache-control": "no-store",
      },
    });
  }

  const header = [
    "id",
    "created_at",
    "actor_id",
    "actor_name",
    "action",
    "entity_type",
    "entity_id",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const actorName = r.actor_id
      ? formatActorName(profilesById.get(r.actor_id), "System")
      : "System";
    lines.push(
      [
        r.id,
        r.created_at,
        r.actor_id ?? "",
        actorName,
        r.action,
        r.entity_type,
        r.entity_id ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="audit-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}

/** RFC 4180 quoting: wrap if cell contains comma, quote, or newline. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
