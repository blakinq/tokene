-- Let any workspace mate read each other's basic profile so display names
-- render in member lists, audit, reviews, comments, etc. The initial
-- "self-only" policy was causing every actor to fall back to "Unknown" in
-- the UI and broke the comment.mention matcher.

create policy "profiles workspace mates select" on public.profiles
  for select using (
    exists (
      select 1
        from public.workspace_members me
        join public.workspace_members them
          on them.workspace_id = me.workspace_id
       where me.user_id = auth.uid()
         and them.user_id = public.profiles.id
    )
  );
