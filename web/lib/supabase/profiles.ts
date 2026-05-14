import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileLite = {
  id: string;
  display_name: string | null;
  email: string;
};

/**
 * Look up profiles by user id.
 *
 * `auth.users`-referencing columns (audit_logs.actor_id, change_requests.author_id,
 * reviews.reviewer_id, releases.published_by, workspace_members.user_id) can't be
 * embedded via PostgREST because the FK target is `auth.users`, not
 * `public.profiles`. Pages that need display names should call this and merge.
 */
export async function loadProfiles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userIds: Array<string | null | undefined>,
): Promise<Map<string, ProfileLite>> {
  const ids = Array.from(
    new Set(userIds.filter((id): id is string => Boolean(id))),
  );
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", ids);

  const map = new Map<string, ProfileLite>();
  for (const p of (data ?? []) as unknown as ProfileLite[]) {
    map.set(p.id, p);
  }
  return map;
}

export function formatActorName(
  profile: ProfileLite | undefined,
  fallback = "Unknown",
): string {
  return (
    profile?.display_name ??
    profile?.email?.split("@")[0] ??
    fallback
  );
}
