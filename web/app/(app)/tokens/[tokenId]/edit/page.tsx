import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { TokenStatusBadge } from "@/components/status-badge";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

import { EditTokenForm } from "./edit-token-form";

type TokenRow = {
  id: string;
  name: string;
  type: string;
  level: string;
  status:
    | "draft"
    | "in_review"
    | "approved"
    | "published"
    | "deprecated"
    | "archived";
  current_value: string | null;
  description: string | null;
};

export default async function EditTokenPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();

  const { data, error } = await supabase
    .from("tokens")
    .select("id, name, type, level, status, current_value, description")
    .eq("id", tokenId)
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const tok = data as TokenRow;

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Tokens", href: "/tokens" },
          { label: tok.name, href: `/tokens/${tok.id}` },
          { label: "Edit" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground -ml-2 w-fit"
          >
            <Link href={`/tokens/${tok.id}`}>
              <ArrowLeft data-icon="inline-start" />
              Back to {tok.name}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal capitalize">
              {tok.level}
            </Badge>
            <TokenStatusBadge status={tok.status} />
            <Badge variant="outline" className="font-normal capitalize">
              {tok.type.replace("_", " ")}
            </Badge>
          </div>
          <h1 className="font-mono text-2xl tracking-tight md:text-3xl">
            Edit {tok.name}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Propose a new value. The live token stays published until the
            change request is approved and a release is published.
          </p>
        </div>
        <EditTokenForm
          tokenId={tok.id}
          tokenName={tok.name}
          tokenType={tok.type}
          tokenStatus={tok.status}
          currentValue={tok.current_value ?? ""}
        />
      </div>
    </>
  );
}
