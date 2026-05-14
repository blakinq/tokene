import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AcceptInviteForm } from "./accept-form";

type Params = Promise<{ token: string }>;

type Lookup = {
  workspace_id: string;
  workspace_name: string;
  workspace_product: string | null;
  email: string;
  role: "viewer" | "contributor" | "reviewer" | "admin";
  expired: boolean;
  consumed: boolean;
};

export default async function InvitePage({ params }: { params: Params }) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("invite_lookup", {
    p_token: token,
  } as never);
  const invite = (Array.isArray(data) ? (data[0] as Lookup) : null) ?? null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = (() => {
    if (error || !invite) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Invite not found</AlertTitle>
          <AlertDescription>
            This link is invalid or has been revoked.
          </AlertDescription>
        </Alert>
      );
    }
    if (invite.consumed) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Invite no longer active</AlertTitle>
          <AlertDescription>
            It has already been used or was revoked.
          </AlertDescription>
        </Alert>
      );
    }
    if (invite.expired) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Invite expired</AlertTitle>
          <AlertDescription>
            Ask the workspace admin to send a new one.
          </AlertDescription>
        </Alert>
      );
    }

    if (!user) {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Sign in or create an account with{" "}
            <span className="text-foreground font-medium">{invite.email}</span>{" "}
            to join{" "}
            <span className="text-foreground font-medium">
              {invite.workspace_name}
            </span>
            .
          </p>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href={`/signup?invite=${encodeURIComponent(token)}`}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/login?invite=${encodeURIComponent(token)}`}>
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    const emailMismatch =
      (user.email ?? "").toLowerCase() !== invite.email.toLowerCase();
    if (emailMismatch) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Wrong account</AlertTitle>
          <AlertDescription>
            This invite is for{" "}
            <span className="font-medium">{invite.email}</span>, but you&apos;re
            signed in as{" "}
            <span className="font-medium">{user.email ?? "unknown"}</span>. Sign
            out and try again.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <AcceptInviteForm
        token={token}
        workspaceName={invite.workspace_name}
        role={invite.role}
      />
    );
  })();

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            You&apos;re invited
          </CardTitle>
          <CardDescription>
            {invite
              ? `Join ${invite.workspace_name} on Tokene.`
              : "Workspace invitation"}
          </CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
        <CardFooter className="text-muted-foreground justify-center text-xs">
          <Link href="/login" className="hover:text-foreground underline">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
