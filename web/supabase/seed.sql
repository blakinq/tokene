-- Seeds a single workspace plus a few primitive + semantic color tokens that
-- mirror the PRD §36 slice. Run AFTER an auth user exists (so the foreign key
-- on workspace_members can resolve). If you'd rather seed against your own
-- user, replace the demo_user_id CTE with a select on auth.users by email.

with demo_user as (
  select id from auth.users limit 1
),
new_workspace as (
  insert into public.workspaces (id, name, slug, product, created_by)
  select '00000000-0000-0000-0000-000000000001', 'Acme', 'acme-core', 'Core', du.id
  from demo_user du
  on conflict (id) do nothing
  returning id
),
ensure_member as (
  insert into public.workspace_members (workspace_id, user_id, role)
  select '00000000-0000-0000-0000-000000000001', du.id, 'admin'
  from demo_user du
  on conflict (workspace_id, user_id) do update set role = excluded.role
  returning workspace_id
)
select 1;

-- Primitive color token: color.blue.600
insert into public.tokens (
  id, workspace_id, name, type, level, status,
  description, current_value, current_resolved_value
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'color.blue.600',
  'color',
  'primitive',
  'published',
  'Deep blue for hover and pressed states.',
  '#005FCC',
  '#005FCC'
) on conflict (id) do nothing;

-- Semantic color token: color.background.brand → references color.blue.600
insert into public.tokens (
  id, workspace_id, name, type, level, status,
  description, current_value, current_resolved_value
) values (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'color.background.brand',
  'color',
  'semantic',
  'published',
  'Surface color of primary brand actions.',
  '{color.blue.600}',
  '#005FCC'
) on conflict (id) do nothing;

insert into public.token_references (workspace_id, source_token_id, referenced_token_id)
values (
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001'
) on conflict do nothing;
