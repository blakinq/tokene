"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/app/(app)/actions/members";
import type { WorkspaceRole } from "@/lib/supabase/types";

const ROLES: WorkspaceRole[] = ["viewer", "contributor", "reviewer", "admin"];

export function MemberControls({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: WorkspaceRole;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const handleRoleChange = (next: string) => {
    if (next === role) return;
    const fd = new FormData();
    fd.append("userId", userId);
    fd.append("role", next);
    startTransition(async () => {
      try {
        await updateMemberRoleAction(fd);
      } catch (e) {
        // Surface to the user with a basic alert. Settings page reload is
        // handled by revalidatePath on success.
        alert(e instanceof Error ? e.message : "Failed to update role.");
      }
    });
  };

  const handleRemove = () => {
    if (!confirm("Remove this member from the workspace?")) return;
    const fd = new FormData();
    fd.append("userId", userId);
    startTransition(async () => {
      try {
        await removeMemberAction(fd);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to remove member.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={role}
        disabled={pending}
        onValueChange={handleRoleChange}
      >
        <SelectTrigger size="sm" className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r} className="capitalize">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive h-8 text-xs"
        onClick={handleRemove}
        disabled={pending || isSelf}
      >
        Remove
      </Button>
    </div>
  );
}
