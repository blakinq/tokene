"use server";

import { redirect } from "next/navigation";

import { createChangeRequestForToken } from "@/app/(app)/actions/change-requests";

export async function proposeChangeForToken(formData: FormData) {
  const tokenId = String(formData.get("tokenId"));
  const tokenName = String(formData.get("tokenName") ?? "");
  const result = await createChangeRequestForToken(
    tokenId,
    `Promote ${tokenName}`,
    `Promote ${tokenName} to published via review.`,
  );
  if (!result || result.ok === false) {
    throw new Error(result?.error ?? "Failed to create change request.");
  }
  redirect(`/change-requests/${result.id}`);
}
