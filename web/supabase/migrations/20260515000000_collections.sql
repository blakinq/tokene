-- Collections: workspace-scoped groupings of tokens.
-- A token can belong to many collections; a collection belongs to one workspace.

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, slug)
);

create index collections_workspace_idx on public.collections(workspace_id);

create table public.collection_tokens (
  collection_id uuid not null references public.collections(id) on delete cascade,
  token_id uuid not null references public.tokens(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null,
  primary key (collection_id, token_id)
);

create index collection_tokens_collection_idx on public.collection_tokens(collection_id);
create index collection_tokens_token_idx on public.collection_tokens(token_id);

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.collections enable row level security;
alter table public.collection_tokens enable row level security;

create policy "collections member select" on public.collections
  for select using (public.is_workspace_member(workspace_id));
create policy "collections contributor insert" on public.collections
  for insert with check (public.workspace_role_at_least(workspace_id, 'contributor'));
create policy "collections contributor update" on public.collections
  for update using (public.workspace_role_at_least(workspace_id, 'contributor'));
create policy "collections admin delete" on public.collections
  for delete using (public.workspace_role_at_least(workspace_id, 'admin'));

create policy "ct member select" on public.collection_tokens
  for select using (public.is_workspace_member(workspace_id));
create policy "ct contributor write" on public.collection_tokens
  for all using (public.workspace_role_at_least(workspace_id, 'contributor'))
  with check (public.workspace_role_at_least(workspace_id, 'contributor'));
