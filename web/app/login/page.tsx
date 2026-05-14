import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

type Search = Promise<{ invite?: string }>;

export default async function LoginPage({
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

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Tokene
          </CardTitle>
          <CardDescription>Sign in to your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm inviteToken={invite} />
        </CardContent>
        <CardFooter className="text-muted-foreground flex flex-col gap-1 text-center text-xs">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href={
                invite
                  ? `/signup?invite=${encodeURIComponent(invite)}`
                  : "/signup"
              }
              className="hover:text-foreground underline"
            >
              Create one
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
