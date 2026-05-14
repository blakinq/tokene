import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { ImportForm } from "./import-form";

export default async function NewImportPage() {
  const { workspace } = await getCurrentWorkspaceOrRedirect();

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Imports", href: "/imports" },
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
            <Link href="/imports">
              <ArrowLeft data-icon="inline-start" />
              All imports
            </Link>
          </Button>
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Data
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              Import tokens
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Imports never publish directly — every uploaded file becomes a
              draft change request that runs through review and release.
            </p>
          </div>
        </div>
        <div className="max-w-3xl">
          <ImportForm />
        </div>
      </div>
    </>
  );
}
