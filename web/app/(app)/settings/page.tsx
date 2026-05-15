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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SiteHeader } from "@/components/site-header";
import { loadProfiles } from "@/lib/supabase/profiles";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import { loadSchemaConfig } from "@/lib/supabase/schema-config";
import { WorkspaceForm } from "./workspace-form";
import { InviteForm } from "./invite-form";
import { RevokeInviteButton } from "./revoke-invite-button";
import { SchemaForm } from "./schema-form";
import { ApiKeysSection, type ApiKeyView } from "./api-keys-section";
import {
  NotificationEndpointsSection,
  type NotificationEndpointView,
} from "./notification-endpoints-section";

type MemberRow = {
  role: "viewer" | "contributor" | "reviewer" | "admin";
  user_id: string;
  created_at: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: "viewer" | "contributor" | "reviewer" | "admin";
  created_at: string;
  expires_at: string;
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

  const { data: invitesRaw } = await supabase
    .from("workspace_invites")
    .select("id, email, role, created_at, expires_at")
    .eq("workspace_id", workspace.workspaceId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  const invites = (invitesRaw ?? []) as unknown as InviteRow[];

  const schemaConfig = await loadSchemaConfig(supabase, workspace.workspaceId);

  let apiKeys: ApiKeyView[] = [];
  if (isAdmin) {
    const { data: keysRaw } = await supabase
      .from("api_keys")
      .select(
        "id, name, prefix, scopes, created_at, last_used_at, revoked_at",
      )
      .eq("workspace_id", workspace.workspaceId)
      .order("created_at", { ascending: false });
    apiKeys = (keysRaw ?? []) as unknown as ApiKeyView[];
  }

  const { data: endpointsRaw } = await supabase
    .from("notification_endpoints")
    .select(
      "id, kind, target, enabled, event_filter, created_at, last_delivered_at, last_error, last_error_at",
    )
    .eq("workspace_id", workspace.workspaceId)
    .order("created_at", { ascending: false });
  const endpoints = (endpointsRaw ?? []) as unknown as NotificationEndpointView[];

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
            <TabsTrigger value="schema">Schema + approvals</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            {isAdmin ? <TabsTrigger value="api">API keys</TabsTrigger> : null}
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
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Invite a teammate
                  </CardTitle>
                  <CardDescription>
                    Generate a one-time link tied to an email and role. Share
                    it directly; the recipient signs up or in to join.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InviteForm />
                </CardContent>
              </Card>
            ) : null}

            {invites.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Pending invites
                    <span className="text-muted-foreground ml-2 font-mono text-sm">
                      {invites.length}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Awaiting acceptance. Expires 14 days after creation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col">
                    {invites.map((inv) => {
                      const expires = new Date(inv.expires_at);
                      const expiresLabel = Number.isNaN(expires.getTime())
                        ? "—"
                        : expires.toLocaleDateString();
                      return (
                        <li
                          key={inv.id}
                          className="border-border/60 flex items-center gap-3 border-b py-3 last:border-b-0"
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium">
                              {inv.email}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              Expires {expiresLabel}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="font-normal capitalize"
                          >
                            {inv.role}
                          </Badge>
                          {isAdmin ? (
                            <RevokeInviteButton id={inv.id} />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

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
            <SchemaForm initial={schemaConfig} disabled={!isAdmin} />
          </TabsContent>

          <TabsContent value="notifications" className="flex flex-col gap-6">
            <NotificationEndpointsSection
              endpoints={endpoints}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="api" className="flex flex-col gap-6">
              <ApiKeysSection keys={apiKeys} isAdmin={isAdmin} />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  );
}
