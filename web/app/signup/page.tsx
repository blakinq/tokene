import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignUpForm } from "./sign-up-form";

type Search = Promise<{ invite?: string }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { invite } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(invite ? `/invite/${encodeURIComponent(invite)}` : "/tokens");
  }

  // If the user is signing up via an invite link, pre-fill their email so they
  // can't accidentally create an account that doesn't match the invite.
  let invitedEmail: string | undefined;
  let invitedWorkspace: string | undefined;
  if (invite) {
    const { data } = await supabase.rpc("invite_lookup", {
      p_token: invite,
    } as never);
    const row = (Array.isArray(data) ? data[0] : null) as
      | {
          email: string;
          workspace_name: string;
          expired: boolean;
          consumed: boolean;
        }
      | null;
    if (row && !row.consumed && !row.expired) {
      invitedEmail = row.email;
      invitedWorkspace = row.workspace_name;
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription>
            {invitedWorkspace
              ? `You've been invited to ${invitedWorkspace}.`
              : "Sign up to spin up your own Tokene workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm inviteToken={invite} defaultEmail={invitedEmail} />
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
