-- Atomic workspace creation. Bundles the workspaces row + admin membership
-- into one SECURITY DEFINER call so:
--   * the two inserts share a transaction (no orphan workspace if member
--     insert fails),
--   * we get a clear "not authenticated" error if the user JWT isn't
--     reaching Postgres, instead of an opaque RLS denial.

create or replace function public.create_workspace(
  p_name text,
  p_slug text,
  p_product text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ws_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'workspace name is required';
  end if;
  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'workspace slug is required';
  end if;

  insert into public.workspaces (name, slug, product, created_by)
  values (
    trim(p_name),
    trim(p_slug),
    nullif(trim(coalesce(p_product, '')), ''),
    v_user_id
  )
  returning id into v_ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws_id, v_user_id, 'admin');

  return v_ws_id;
end;
$$;

grant execute on function public.create_workspace(text, text, text) to authenticated;
