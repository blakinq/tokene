import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspace } = await getCurrentWorkspaceOrRedirect();

  return (
    <SidebarProvider>
      <AppSidebar
        workspace={workspace}
        user={{
          email: user.email ?? "",
          displayName:
            (user.user_metadata?.display_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "User",
        }}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
