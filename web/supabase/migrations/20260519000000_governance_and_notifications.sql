-- Adds the rest of the §35.1 MVP scope:
--   §6.4 / §18  schema_configs (workspace governance)
--   §11.3       approval rules (folded into schema_configs)
--   §10.5/8.5   migration_notes column on change_requests + breaking flag use
--   §15        notifications + dispatch helpers
--   §5.7/§28.4 api_keys (hashed) + lookup helper
--   §16        a few extra audit actions implicitly via existing record_audit

-- -----------------------------------------------------------------------------
-- Schema config (one row per workspace, lazily created)
-- -----------------------------------------------------------------------------

create table public.schema_configs (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  naming_pattern text not null default '^[a-z][a-z0-9]*(\.[a-z0-9]+)+$',
  allowed_token_types public.token_type[] not null default array[
    'color','spacing','sizing','radius','border_width','typography',
    'shadow','opacity','z_index','duration','easing'
  ]::public.token_type[],
  required_fields text[] not null default array['name','type','value','description'],
  -- Approval rules (§11.3)
  min_approval_count int not null default 1 check (min_approval_count between 1 and 10),
  allow_self_approval boolean not null default false,
  require_admin_for_breaking boolean not null default true,
  require_migration_notes_for_breaking boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.schema_configs enable row level security;

create policy "schema_configs member select" on public.schema_configs
  for select using (public.is_workspace_member(workspace_id));
create policy "schema_configs admin write" on public.schema_configs
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

create trigger schema_configs_set_updated_at
  before update on public.schema_configs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Change request: migration notes
-- -----------------------------------------------------------------------------

alter table public.change_requests
  add column if not exists migration_notes text;

-- -----------------------------------------------------------------------------
-- Notifications (§15)
-- -----------------------------------------------------------------------------

create type public.notification_kind as enum (
  'change_request.submitted',
  'change_request.approved',
  'change_request.changes_requested',
  'release.published',
  'token.deprecated',
  'comment.mention',
  'reviewer.assigned'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind public.notification_kind not null,
  entity_type text not null,
  entity_id text,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications(recipient_id, read_at, created_at desc);
create index notifications_workspace_idx
  on public.notifications(workspace_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications recipient select" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notifications recipient update" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Server actions write via this SECURITY DEFINER helper so RLS doesn't block
-- inserts that need to fan out to other users.
create or replace function public.notify_workspace(
  ws_id uuid,
  p_kind public.notification_kind,
  p_entity_type text,
  p_entity_id text,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_exclude_actor boolean default true,
  p_role_at_least public.workspace_role default 'viewer'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int := 0;
  actor uuid := auth.uid();
begin
  insert into public.notifications (
    workspace_id, recipient_id, actor_id, kind, entity_type, entity_id,
    title, body, link
  )
  select ws_id, wm.user_id, actor, p_kind, p_entity_type, p_entity_id,
         p_title, p_body, p_link
    from public.workspace_members wm
   where wm.workspace_id = ws_id
     and (not p_exclude_actor or wm.user_id <> coalesce(actor, '00000000-0000-0000-0000-000000000000'::uuid))
     and case p_role_at_least
       when 'viewer' then wm.role in ('viewer','contributor','reviewer','admin')
       when 'contributor' then wm.role in ('contributor','reviewer','admin')
       when 'reviewer' then wm.role in ('reviewer','admin')
       when 'admin' then wm.role = 'admin'
     end;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

create or replace function public.notify_user(
  ws_id uuid,
  p_recipient uuid,
  p_kind public.notification_kind,
  p_entity_type text,
  p_entity_id text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient is null or p_recipient = auth.uid() then
    return;
  end if;
  insert into public.notifications (
    workspace_id, recipient_id, actor_id, kind, entity_type, entity_id,
    title, body, link
  ) values (
    ws_id, p_recipient, auth.uid(), p_kind, p_entity_type, p_entity_id,
    p_title, p_body, p_link
  );
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated int := 0;
begin
  update public.notifications
     set read_at = now()
   where recipient_id = auth.uid()
     and read_at is null
     and (p_ids is null or id = any(p_ids));
  get diagnostics updated = row_count;
  return updated;
end;
$$;

-- -----------------------------------------------------------------------------
-- API keys (§5.7, §28.4)
--   Stored as SHA-256 hashes; only the prefix is shown after creation.
--   Scopes are an enum-like text array; we keep MVP scopes from the spec.
-- -----------------------------------------------------------------------------

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  prefix text not null,
  token_hash text not null unique,
  scopes text[] not null default array['tokens:read','releases:read','exports:create','changelog:read'],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_keys_workspace_idx on public.api_keys(workspace_id, created_at desc);

alter table public.api_keys enable row level security;

create policy "api_keys admin select" on public.api_keys
  for select using (public.workspace_role_at_least(workspace_id, 'admin'));
create policy "api_keys admin write" on public.api_keys
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

-- Service-role lookup: take a hash, return workspace + scopes if active.
create or replace function public.api_key_resolve(p_hash text)
returns table (
  api_key_id uuid,
  workspace_id uuid,
  scopes text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select id, workspace_id, scopes
    from public.api_keys
   where token_hash = p_hash
     and revoked_at is null
   limit 1;
$$;

create or replace function public.api_key_touch(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.api_keys set last_used_at = now() where id = p_id;
$$;
