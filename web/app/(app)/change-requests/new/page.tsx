import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { NewCRForm, type CandidateToken } from "./new-cr-form";

export default async function NewChangeRequestPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("tokens")
    .select("id, name, type, level, status, current_value")
    .eq("workspace_id", workspace.workspaceId)
    .in("status", ["draft", "in_review"])
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  const candidates = (data ?? []) as unknown as CandidateToken[];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Change requests", href: "/change-requests" },
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
            <Link href="/change-requests">
              <ArrowLeft data-icon="inline-start" />
              All change requests
            </Link>
          </Button>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Flow
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              New change request
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Bundle related token edits into a reviewable unit. Every change
              request runs through validation, review, and release.
            </p>
          </div>
        </div>
        <div className="max-w-3xl">
          <NewCRForm candidates={candidates} />
        </div>
      </div>
    </>
  );
}
