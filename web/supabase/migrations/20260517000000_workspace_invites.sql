-- Self-serve invites: admins create a per-email invite token; recipients
-- consume it by signing up / signing in and calling invite_accept(token).
--
-- Token lookup and acceptance run through SECURITY DEFINER RPCs so we don't
-- have to expose the invites table to anonymous reads. Workspace members keep
-- read access to their own workspace's invites for the Settings UI.

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'contributor',
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

create index workspace_invites_workspace_idx on public.workspace_invites(workspace_id);
create index workspace_invites_email_idx on public.workspace_invites(lower(email));

-- At most one pending invite per (workspace, email).
create unique index workspace_invites_pending_email_idx
  on public.workspace_invites(workspace_id, lower(email))
  where accepted_at is null and revoked_at is null;

alter table public.workspace_invites enable row level security;

create policy "invites member select" on public.workspace_invites
  for select using (public.is_workspace_member(workspace_id));

create policy "invites admin write" on public.workspace_invites
  for all using (public.workspace_role_at_least(workspace_id, 'admin'))
  with check (public.workspace_role_at_least(workspace_id, 'admin'));

-- Anonymous-safe lookup: returns the workspace name + status for a token so the
-- /invite/[token] page can render context without exposing the invites table.
create or replace function public.invite_lookup(p_token text)
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_product text,
  email text,
  role public.workspace_role,
  expired boolean,
  consumed boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    w.name,
    w.product,
    i.email,
    i.role,
    (i.expires_at < now()) as expired,
    (i.accepted_at is not null or i.revoked_at is not null) as consumed
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = p_token
  limit 1;
$$;

grant execute on function public.invite_lookup(text) to anon, authenticated;

-- Atomic accept: validates the invite against the caller's auth.users email,
-- inserts the membership, marks the invite consumed. Returns the workspace id.
create or replace function public.invite_accept(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.workspace_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invite from public.workspace_invites
    where token = p_token
    for update;

  if not found then
    raise exception 'invite not found';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite already accepted';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite revoked';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite expired';
  end if;
  if lower(v_invite.email) <> lower(v_user_email) then
    raise exception 'invite is for a different email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user_id, v_invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invites
    set accepted_at = now(),
        accepted_by = v_user_id
    where id = v_invite.id;

  return v_invite.workspace_id;
end;
$$;

grant execute on function public.invite_accept(text) to authenticated;
