import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { NewReleaseForm, type ApprovedCR } from "./new-release-form";

export default async function NewReleasePage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  const isAdmin = workspace.role === "admin";

  const { data, error } = await supabase
    .from("change_requests")
    .select(
      "id, short_id, title, breaking, stale, items:change_request_items(id)",
    )
    .eq("workspace_id", workspace.workspaceId)
    .eq("status", "approved")
    .eq("stale", false)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const approved = (data ?? []) as unknown as ApprovedCR[];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Releases", href: "/releases" },
          { label: "New" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground -ml-2 w-fit"
          >
            <Link href="/releases">
              <ArrowLeft data-icon="inline-start" />
              All releases
            </Link>
          </Button>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Flow
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              Draft release
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              A release is an immutable, versioned snapshot. Once published, it
              can&apos;t be edited — any correction needs a new release.
            </p>
          </div>
        </div>
        <div className="max-w-3xl">
          {!isAdmin ? (
            <Alert variant="destructive">
              <AlertTitle>Admin required</AlertTitle>
              <AlertDescription>
                Only workspace admins can publish releases.
              </AlertDescription>
            </Alert>
          ) : (
            <NewReleaseForm
              approved={approved}
              idempotencyKey={crypto.randomUUID()}
            />
          )}
        </div>
      </div>
    </>
  );
}
