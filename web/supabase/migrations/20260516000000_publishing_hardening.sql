-- Publishing hardening: workspace publish lock (gap #4), release idempotency
-- (gap #6), stale CR detection (gap #7), CR comments (gap #8).

-- -----------------------------------------------------------------------------
-- #4 Release publish lock
-- -----------------------------------------------------------------------------
-- pg_advisory_lock isn't reliable through Supabase's transaction pooler, so we
-- model the mutex as a row with an expiry. A stale row (past expires_at) can
-- be re-acquired, which prevents indefinite deadlocks if a publish crashed
-- before releasing.

create table public.release_locks (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  locked_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 seconds'
);

alter table public.release_locks enable row level security;

create policy "release_locks member select" on public.release_locks
  for select using (public.is_workspace_member(workspace_id));

-- Acquire a 60-second publish mutex for a workspace. Returns true if granted.
-- security definer so the function bypasses RLS for the upsert.
create or replace function public.try_acquire_release_lock(ws_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  granted boolean := false;
begin
  if not public.workspace_role_at_least(ws_id, 'admin') then
    return false;
  end if;

  insert into public.release_locks (workspace_id, locked_by)
  values (ws_id, auth.uid())
  on conflict (workspace_id) do update
    set locked_by = excluded.locked_by,
        locked_at = excluded.locked_at,
        expires_at = excluded.expires_at
    where public.release_locks.expires_at < now()
  returning true into granted;

  return coalesce(granted, false);
end;
$$;

create or replace function public.release_publish_lock(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.release_locks
   where workspace_id = ws_id
     and (locked_by = auth.uid() or public.workspace_role_at_least(ws_id, 'admin'));
end;
$$;

-- -----------------------------------------------------------------------------
-- #6 Idempotency on releases
-- -----------------------------------------------------------------------------
alter table public.releases
  add column idempotency_key text;

create unique index releases_workspace_idempotency_idx
  on public.releases(workspace_id, idempotency_key)
  where idempotency_key is not null;

-- -----------------------------------------------------------------------------
-- #7 Stale change requests
-- -----------------------------------------------------------------------------
alter table public.change_requests
  add column stale boolean not null default false,
  add column stale_reason text;

-- -----------------------------------------------------------------------------
-- #8 Comments on change requests
-- -----------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index comments_change_request_idx on public.comments(change_request_id, created_at);

alter table public.comments enable row level security;

create policy "comments member select" on public.comments
  for select using (public.is_workspace_member(workspace_id));

create policy "comments contributor insert" on public.comments
  for insert with check (
    public.workspace_role_at_least(workspace_id, 'contributor')
    and author_id = auth.uid()
  );

-- Authors can delete their own comments; admins can delete any.
create policy "comments author or admin delete" on public.comments
  for delete using (
    author_id = auth.uid()
    or public.workspace_role_at_least(workspace_id, 'admin')
  );
