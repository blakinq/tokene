-- TokenOps initial schema for the PRD §36 vertical slice.
-- Covers identity/workspace, tokens, references, change requests, releases,
-- snapshots, and audit logs, with workspace-scoped RLS.

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- -----------------------------------------------------------------------------
-- Enum types
-- -----------------------------------------------------------------------------

create type public.workspace_role as enum ('viewer','contributor','reviewer','admin');

create type public.token_type as enum (
  'color','spacing','sizing','radius','border_width','typography',
  'shadow','opacity','z_index','duration','easing'
);

create type public.token_level as enum ('primitive','semantic','component');

create type public.token_status as enum (
  'draft','in_review','approved','published','deprecated','archived'
);

create type public.change_request_status as enum (
  'draft','open','changes_requested','approved','published','rejected','closed'
);

create type public.change_request_item_kind as enum (
  'add','edit','rename','deprecate','archive','restore','delete_draft'
);

create type public.review_decision as enum ('approve','request_changes','comment');

create type public.release_status as enum ('draft','published','archived');

-- -----------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Workspaces and membership
-- -----------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'contributor',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members(user_id);

-- -----------------------------------------------------------------------------
-- Tokens
-- -----------------------------------------------------------------------------

create table public.tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type public.token_type not null,
  level public.token_level not null,
  status public.token_status not null default 'draft',
  description text,
  tags text[] not null default '{}',
  current_value text,
  current_resolved_value text,
  deprecated boolean not null default false,
  replacement_token_id uuid references public.tokens(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, name)
);

create index tokens_workspace_idx on public.tokens(workspace_id);
create index tokens_workspace_status_idx on public.tokens(workspace_id, status);
create index tokens_workspace_type_idx on public.tokens(workspace_id, type);
create index tokens_name_trgm_idx on public.tokens using gin (name gin_trgm_ops);
create index tokens_tags_idx on public.tokens using gin (tags);

create table public.token_versions (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.tokens(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  value text not null,
  resolved_value text not null,
  metadata jsonb not null default '{}'::jsonb,
  release_id uuid,
  change_request_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index token_versions_token_idx on public.token_versions(token_id);

create table public.token_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_token_id uuid not null references public.tokens(id) on delete cascade,
  referenced_token_id uuid not null references public.tokens(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_token_id, referenced_token_id)
);
create index token_references_source_idx on public.token_references(source_token_id);
create index token_references_target_idx on public.token_references(referenced_token_id);

-- -----------------------------------------------------------------------------
-- Change requests
-- -----------------------------------------------------------------------------

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  short_id text not null,
  title text not null,
  description text,
  status public.change_request_status not null default 'draft',
  breaking boolean not null default false,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, short_id)
);
create index change_requests_workspace_idx on public.change_requests(workspace_id);

create table public.change_request_items (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind public.change_request_item_kind not null,
  token_id uuid references public.tokens(id) on delete set null,
  token_name text not null,
  token_type public.token_type,
  token_level public.token_level,
  before_value text,
  after_value text,
  note text,
  position int not null default 0
);
create index cri_change_request_idx on public.change_request_items(change_request_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  decision public.review_decision not null,
  comment text,
  created_at timestamptz not null default now()
);
create index reviews_change_request_idx on public.reviews(change_request_id);

-- -----------------------------------------------------------------------------
-- Releases and snapshots
-- -----------------------------------------------------------------------------

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version text not null,
  status public.release_status not null default 'draft',
  summary text,
  breaking boolean not null default false,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, version)
);
create index releases_workspace_idx on public.releases(workspace_id);

create table public.release_change_requests (
  release_id uuid not null references public.releases(id) on delete cascade,
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  primary key (release_id, change_request_id)
);

create table public.release_token_snapshots (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_id uuid references public.tokens(id) on delete set null,
  name text not null,
  type public.token_type not null,
  level public.token_level not null,
  value text not null,
  resolved_value text not null,
  description text,
  tags text[] not null default '{}',
  deprecated boolean not null default false,
  replacement_token_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index rts_release_idx on public.release_token_snapshots(release_id);

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_workspace_idx on public.audit_logs(workspace_id, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS helpers
-- -----------------------------------------------------------------------------

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_at_least(
  ws_id uuid,
  required public.workspace_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
      and case required
        when 'viewer' then wm.role in ('viewer','contributor','reviewer','admin')
        when 'contributor' then wm.role in ('contributor','reviewer','admin')
        when 'reviewer' then wm.role in ('reviewer','admin')
        when 'admin' then wm.role = 'admin'
      end
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on every public table
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tokens enable row level security;
alter table public.token_versions enable row level security;
alter table public.token_references enable row level security;
alter table public.change_requests enable row level security;
alter table public.change_request_items enable row level security;
alter table public.reviews enable row level security;
alter table public.releases enable row level security;
alter table public.release_change_requests enable row level security;
alter table public.release_token_snapshots enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: each user can read/write their own row.
create policy "profiles self select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid());

-- Workspaces
create policy "workspaces member select" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "workspaces authenticated insert" on public.workspaces
  for insert with check (auth.uid() is not null);
create policy "workspaces admin update" on public.workspaces
  for update using (public.workspace_role_at_least(id, 'admin'));

-- Workspace members
create policy "wm member select" on public.workspace_members
  for select using (
    user_id = auth.uid() or public.is_workspace_member(workspace_id)
  );
create policy "wm admin write" on public.workspace_members
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

-- Tokens
create policy "tokens member select" on public.tokens
  for select using (public.is_workspace_member(workspace_id));
create policy "tokens contributor insert" on public.tokens
  for insert with check (public.workspace_role_at_least(workspace_id, 'contributor'));
create policy "tokens contributor update" on public.tokens
  for update using (public.workspace_role_at_least(workspace_id, 'contributor'));
create policy "tokens admin delete" on public.tokens
  for delete using (public.workspace_role_at_least(workspace_id, 'admin'));

-- Token versions / references
create policy "tv member select" on public.token_versions
  for select using (public.is_workspace_member(workspace_id));
create policy "tv contributor insert" on public.token_versions
  for insert with check (public.workspace_role_at_least(workspace_id, 'contributor'));

create policy "tr member select" on public.token_references
  for select using (public.is_workspace_member(workspace_id));
create policy "tr contributor write" on public.token_references
  for all using (public.workspace_role_at_least(workspace_id, 'contributor'))
  with check (public.workspace_role_at_least(workspace_id, 'contributor'));

-- Change requests
create policy "cr member select" on public.change_requests
  for select using (public.is_workspace_member(workspace_id));
create policy "cr contributor insert" on public.change_requests
  for insert with check (public.workspace_role_at_least(workspace_id, 'contributor'));
create policy "cr author update" on public.change_requests
  for update using (
    public.workspace_role_at_least(workspace_id, 'reviewer')
    or (author_id = auth.uid() and status in ('draft','open','changes_requested'))
  );

create policy "cri member select" on public.change_request_items
  for select using (public.is_workspace_member(workspace_id));
create policy "cri contributor write" on public.change_request_items
  for all using (public.workspace_role_at_least(workspace_id, 'contributor'))
  with check (public.workspace_role_at_least(workspace_id, 'contributor'));

-- Reviews
create policy "reviews member select" on public.reviews
  for select using (public.is_workspace_member(workspace_id));
create policy "reviews reviewer insert" on public.reviews
  for insert with check (
    public.workspace_role_at_least(workspace_id, 'reviewer')
    and reviewer_id = auth.uid()
  );

-- Releases (and links)
create policy "releases member select" on public.releases
  for select using (public.is_workspace_member(workspace_id));
create policy "releases admin write" on public.releases
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

create policy "rcr member select" on public.release_change_requests
  for select using (public.is_workspace_member(workspace_id));
create policy "rcr admin write" on public.release_change_requests
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

create policy "rts member select" on public.release_token_snapshots
  for select using (public.is_workspace_member(workspace_id));
create policy "rts admin write" on public.release_token_snapshots
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

-- Audit logs (read-only via API; inserts done by SECURITY DEFINER helpers)
create policy "audit member select" on public.audit_logs
  for select using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- Audit helper (security definer so it bypasses RLS for inserts)
-- -----------------------------------------------------------------------------

create or replace function public.record_audit(
  ws_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_before jsonb default null,
  p_after jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    workspace_id, actor_id, action, entity_type, entity_id, before_value, after_value
  ) values (
    ws_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tokens_set_updated_at
  before update on public.tokens
  for each row execute function public.set_updated_at();

create trigger change_requests_set_updated_at
  before update on public.change_requests
  for each row execute function public.set_updated_at();
