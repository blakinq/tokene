import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SiteHeader } from "@/components/site-header";
import { loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { WorkspaceForm } from "./workspace-form";

type MemberRow = {
  role: "viewer" | "contributor" | "reviewer" | "admin";
  user_id: string;
  created_at: string;
};

export default async function SettingsPage() {
  const { supabase, workspace } = await getCurrentWorkspaceOrRedirect();
  const isAdmin = workspace.role === "admin";

  const { data: membersRaw } = await supabase
    .from("workspace_members")
    .select("role, user_id, created_at")
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: true });

  const members = (membersRaw ?? []) as unknown as MemberRow[];
  const profilesById = await loadProfiles(
    supabase,
    members.map((m) => m.user_id),
  );

  return (
    <>
      <SiteHeader
        crumbs={[
          {
            label: `${workspace.workspaceName} · ${workspace.workspaceProduct ?? ""}`.trim(),
            href: "/",
          },
          { label: "Settings" },
        ]}
      />
      <div className="flex flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Workspace
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Configure governance for the {workspace.workspaceName}
            {workspace.workspaceProduct ? ` · ${workspace.workspaceProduct}` : ""}{" "}
            workspace.
            {!isAdmin ? (
              <span className="text-muted-foreground/80">
                {" "}
                You can view settings; only admins can edit.
              </span>
            ) : null}
          </p>
        </div>

        <Tabs defaultValue="general" className="gap-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Workspace profile
                </CardTitle>
                <CardDescription>
                  Visible to all members of this workspace.
                </CardDescription>
              </CardHeader>
              <WorkspaceForm
                initialName={workspace.workspaceName}
                initialProduct={workspace.workspaceProduct ?? ""}
                disabled={!isAdmin}
              />
            </Card>
          </TabsContent>

          <TabsContent value="members" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Members
                  <span className="text-muted-foreground ml-2 font-mono text-sm">
                    {members.length}
                  </span>
                </CardTitle>
                <CardDescription>
                  Anyone with a role here can access this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    No members yet.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {members.map((m) => {
                      const profile = profilesById.get(m.user_id);
                      const name =
                        profile?.display_name ??
                        profile?.email?.split("@")[0] ??
                        "Unknown";
                      const initials = name
                        .split(/\s+/)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <li
                          key={m.user_id}
                          className="border-border/60 flex items-center gap-3 border-b py-3 last:border-b-0"
                        >
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs">
                              {initials || <Users className="size-3" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-medium">{name}</span>
                            <span className="text-muted-foreground truncate text-xs">
                              {profile?.email ?? "—"}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="font-normal capitalize"
                          >
                            {m.role}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schema" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Token naming
                </CardTitle>
                <CardDescription>
                  Pattern enforced by validation. Read-only in MVP — change in
                  code at <span className="font-mono">lib/core/validation.ts</span>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="pattern">Naming pattern</FieldLabel>
                    <Input
                      id="pattern"
                      defaultValue="^[a-z][a-z0-9]*(\.[a-z0-9]+)+$"
                      className="font-mono text-xs"
                      disabled
                    />
                    <FieldDescription>
                      Regular expression. Applied to every token name. e.g.{" "}
                      <span className="font-mono">color.blue.600</span>.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
