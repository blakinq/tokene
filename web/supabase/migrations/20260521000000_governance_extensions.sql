-- §10/§11/§14/§15 extensions to round out the spec scope:
--   reject decision + workflow
--   reviewer assignments (§11.2)
--   token.archived + import.completed + export.completed/failed notifications
--   import_jobs table backing the preview-before-CR flow (§14.3)

-- -----------------------------------------------------------------------------
-- review_decision: add 'reject'
-- -----------------------------------------------------------------------------

alter type public.review_decision add value if not exists 'reject';

-- -----------------------------------------------------------------------------
-- notification_kind: add the events listed in §15.3 that had no enum value
-- -----------------------------------------------------------------------------

alter type public.notification_kind add value if not exists 'token.archived';
alter type public.notification_kind add value if not exists 'change_request.rejected';
alter type public.notification_kind add value if not exists 'import.completed';
alter type public.notification_kind add value if not exists 'export.completed';
alter type public.notification_kind add value if not exists 'export.failed';

-- -----------------------------------------------------------------------------
-- reviewer_assignments (§11.2)
--   A CR can have explicit assigned reviewers. Insert fires a
--   `reviewer.assigned` notification via the existing notify_user helper.
-- -----------------------------------------------------------------------------

create table public.reviewer_assignments (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references public.change_requests(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (change_request_id, reviewer_id)
);

create index reviewer_assignments_cr_idx
  on public.reviewer_assignments(change_request_id);
create index reviewer_assignments_reviewer_idx
  on public.reviewer_assignments(reviewer_id);

alter table public.reviewer_assignments enable row level security;

create policy "ra member select" on public.reviewer_assignments
  for select using (public.is_workspace_member(workspace_id));
create policy "ra reviewer write" on public.reviewer_assignments
  for all using (public.workspace_role_at_least(workspace_id, 'reviewer'))
  with check (public.workspace_role_at_least(workspace_id, 'reviewer'));

-- -----------------------------------------------------------------------------
-- import_jobs (§14.3)
--   Holds a parsed-but-not-yet-committed import so the user can preview before
--   creating a CR. Status moves: parsed -> committed | discarded.
-- -----------------------------------------------------------------------------

create type public.import_job_status as enum ('parsed', 'committed', 'discarded');

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  status public.import_job_status not null default 'parsed',
  source_filename text,
  raw_payload text not null,
  parsed_tokens jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  change_request_id uuid references public.change_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create index import_jobs_workspace_idx
  on public.import_jobs(workspace_id, created_at desc);

alter table public.import_jobs enable row level security;

create policy "import_jobs author select" on public.import_jobs
  for select using (
    public.is_workspace_member(workspace_id)
    and (created_by = auth.uid()
         or public.workspace_role_at_least(workspace_id, 'reviewer'))
  );
create policy "import_jobs contributor write" on public.import_jobs
  for all using (public.workspace_role_at_least(workspace_id, 'contributor'))
  with check (public.workspace_role_at_least(workspace_id, 'contributor'));
