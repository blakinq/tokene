"use server";

import { revalidatePath } from "next/cache";

import { getCurrentWorkspaceOrRedirect } from "@/lib/supabase/queries";
import type { TokenType } from "@/lib/supabase/types";

const VALID_TYPES: TokenType[] = [
  "color",
  "spacing",
  "sizing",
  "radius",
  "border_width",
  "typography",
  "shadow",
  "opacity",
  "z_index",
  "duration",
  "easing",
];

const VALID_REQUIRED_FIELDS = ["name", "type", "value", "description", "tags"];

export type SchemaConfigState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export async function updateSchemaConfigAction(
  _prev: SchemaConfigState,
  formData: FormData,
): Promise<SchemaConfigState> {
  const namingPattern = String(formData.get("namingPattern") ?? "").trim();
  if (!namingPattern) return { ok: false, error: "Naming pattern is required." };
  try {
    new RegExp(namingPattern);
  } catch (e) {
    return {
      ok: false,
      error: `Naming pattern is not valid regex: ${(e as Error).message}`,
    };
  }

  const requestedTypes = formData
    .getAll("allowedTokenTypes")
    .map((v) => String(v));
  const allowedTokenTypes = VALID_TYPES.filter((t) => requestedTypes.includes(t));
  if (allowedTokenTypes.length === 0) {
    return { ok: false, error: "Enable at least one token type." };
  }

  const requestedFields = formData.getAll("requiredFields").map((v) => String(v));
  const requiredFields = VALID_REQUIRED_FIELDS.filter((f) =>
    requestedFields.includes(f),
  );

  const minApprovalCountRaw = Number(formData.get("minApprovalCount") ?? 1);
  const minApprovalCount = Math.max(
    1,
    Math.min(10, Number.isFinite(minApprovalCountRaw) ? minApprovalCountRaw : 1),
  );
  const allowSelfApproval = formData.get("allowSelfApproval") === "on";
  const requireAdminForBreaking =
    formData.get("requireAdminForBreaking") === "on";
  const requireMigrationNotesForBreaking =
    formData.get("requireMigrationNotesForBreaking") === "on";

  const { supabase, workspace, user } = await getCurrentWorkspaceOrRedirect();
  if (workspace.role !== "admin") {
    return { ok: false, error: "Only admins can change workspace settings." };
  }

  const { error } = await supabase
    .from("schema_configs")
    .upsert(
      {
        workspace_id: workspace.workspaceId,
        naming_pattern: namingPattern,
        allowed_token_types: allowedTokenTypes,
        required_fields: requiredFields,
        min_approval_count: minApprovalCount,
        allow_self_approval: allowSelfApproval,
        require_admin_for_breaking: requireAdminForBreaking,
        require_migration_notes_for_breaking: requireMigrationNotesForBreaking,
        updated_by: user.id,
      } as never,
      { onConflict: "workspace_id" } as never,
    );

  if (error) return { ok: false, error: error.message };

  await supabase.rpc("record_audit", {
    ws_id: workspace.workspaceId,
    p_action: "schema.updated",
    p_entity_type: "SchemaConfig",
    p_entity_id: workspace.workspaceId,
    p_after: {
      naming_pattern: namingPattern,
      allowed_token_types: allowedTokenTypes,
      required_fields: requiredFields,
      min_approval_count: minApprovalCount,
      allow_self_approval: allowSelfApproval,
      require_admin_for_breaking: requireAdminForBreaking,
      require_migration_notes_for_breaking: requireMigrationNotesForBreaking,
    },
  } as never);

  revalidatePath("/settings");
  return { ok: true };
}
