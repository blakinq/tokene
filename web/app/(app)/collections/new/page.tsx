import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import {
  NewCollectionForm,
  type CollectionCandidate,
} from "./new-collection-form";

export default async function NewCollectionPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("tokens")
    .select("id, name, type, level, status")
    .eq("workspace_id", workspace.workspaceId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  const candidates = (data ?? []) as unknown as CollectionCandidate[];

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Collections", href: "/collections" },
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
            <Link href="/collections">
              <ArrowLeft data-icon="inline-start" />
              All collections
            </Link>
          </Button>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Library
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              New collection
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Collections are workspace-scoped groupings. Adding or removing a
              token here doesn&apos;t change the token itself.
            </p>
          </div>
        </div>
        <div className="max-w-3xl">
          <NewCollectionForm candidates={candidates} />
        </div>
      </div>
    </>
  );
}
