import { SiteHeader } from "@/components/site-header";
import { NewTokenForm } from "./new-token-form";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

export default async function NewTokenPage() {
  const { workspace } = await getCurrentWorkspaceOrRedirect();
  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Tokens", href: "/tokens" },
          { label: "New" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Library
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create token
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            New tokens start in <span className="font-mono">draft</span>{" "}
            status. Propose them through a change request to publish.
          </p>
        </div>
        <NewTokenForm />
      </div>
    </>
  );
}
