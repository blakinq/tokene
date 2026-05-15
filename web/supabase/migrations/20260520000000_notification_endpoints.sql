-- §15: outbound notification endpoints
-- Webhook + email targets per workspace. Server actions read this table after
-- every in-app notification and fan out HTTP POSTs to each enabled endpoint.

create type public.notification_endpoint_kind as enum ('webhook', 'email');

create table public.notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind public.notification_endpoint_kind not null,
  -- Webhook URL or email address (depending on kind).
  target text not null,
  -- Optional HMAC-SHA256 secret used to sign webhook payloads.
  secret text,
  -- Subset of notification_kind names to deliver. Null = all kinds.
  event_filter text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  last_delivered_at timestamptz,
  last_error text,
  last_error_at timestamptz
);

create index notification_endpoints_workspace_idx
  on public.notification_endpoints(workspace_id, enabled);

alter table public.notification_endpoints enable row level security;

-- Admins manage endpoints; reviewers+ can read so they can verify routing.
create policy "notification_endpoints admin write" on public.notification_endpoints
  for all using (
    public.workspace_role_at_least(workspace_id, 'admin')
  ) with check (
    public.workspace_role_at_least(workspace_id, 'admin')
  );

create policy "notification_endpoints reviewer read" on public.notification_endpoints
  for select using (
    public.workspace_role_at_least(workspace_id, 'reviewer')
  );

-- Server-side updater for delivery status. SECURITY DEFINER so a service-role
-- client can mark success/failure without RLS getting in the way.
create or replace function public.record_endpoint_delivery(
  endpoint_id uuid,
  ok boolean,
  err text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if ok then
    update public.notification_endpoints
       set last_delivered_at = now(),
           last_error = null,
           last_error_at = null
     where id = endpoint_id;
  else
    update public.notification_endpoints
       set last_error = err,
           last_error_at = now()
     where id = endpoint_id;
  end if;
end;
$$;
