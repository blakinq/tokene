"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AcceptInviteState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function acceptInviteAction(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { ok: false, error: "Missing invite token." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?invite=${encodeURIComponent(token)}`);
  }

  const { error } = await supabase.rpc("invite_accept", {
    p_token: token,
  } as never);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/tokens");
}
