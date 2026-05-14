"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignUpState =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; error: string }
  | null;

export async function signUp(
  _state: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Email confirmation is on in the Supabase project when no session is
  // returned. The user has been created; they must click the email link
  // before they can sign in.
  if (!data.session) {
    return { ok: true, needsConfirmation: true };
  }

  revalidatePath("/", "layout");
  if (inviteToken) {
    redirect(`/invite/${encodeURIComponent(inviteToken)}`);
  }
  redirect("/onboarding");
}
