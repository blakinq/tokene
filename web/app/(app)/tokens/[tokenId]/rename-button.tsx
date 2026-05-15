"use client";

import { useTransition } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createRenameCR } from "@/app/(app)/actions/change-requests";

export function RenameTokenButton({
  tokenId,
  currentName,
}: {
  tokenId: string;
  currentName: string;
}) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = window.prompt(
      `Rename ${currentName} to:`,
      currentName,
    );
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === currentName) return;

    const fd = new FormData();
    fd.append("tokenId", tokenId);
    fd.append("newName", trimmed);
    startTransition(async () => {
      try {
        await createRenameCR(fd);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to start rename.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      <Pencil data-icon="inline-start" />
      Rename
    </Button>
  );
}
