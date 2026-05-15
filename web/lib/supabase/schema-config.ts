import "server-only";

import { DEFAULT_SCHEMA, type SchemaConfig } from "@/lib/core/validation";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceSchemaConfig = SchemaConfig & {
  minApprovalCount: number;
  allowSelfApproval: boolean;
  requireAdminForBreaking: boolean;
  requireMigrationNotesForBreaking: boolean;
};

export const DEFAULT_WORKSPACE_SCHEMA: WorkspaceSchemaConfig = {
  ...DEFAULT_SCHEMA,
  minApprovalCount: 1,
  allowSelfApproval: false,
  requireAdminForBreaking: true,
  requireMigrationNotesForBreaking: true,
};

/**
 * Load a workspace's governance config (§6.4 / §11.3 / §18). Returns defaults
 * if the row doesn't exist yet — schema_configs is opt-in and lazily created
 * the first time an admin saves the settings tab.
 */
export async function loadSchemaConfig(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  workspaceId: string,
): Promise<WorkspaceSchemaConfig> {
  const { data } = await supabase
    .from("schema_configs")
    .select(
      "naming_pattern, allowed_token_types, required_fields, min_approval_count, allow_self_approval, require_admin_for_breaking, require_migration_notes_for_breaking",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return DEFAULT_WORKSPACE_SCHEMA;

  const row = data as {
    naming_pattern: string;
    allowed_token_types: string[];
    required_fields: string[];
    min_approval_count: number;
    allow_self_approval: boolean;
    require_admin_for_breaking: boolean;
    require_migration_notes_for_breaking: boolean;
  };

  return {
    namingPattern: row.naming_pattern,
    allowedTokenTypes: row.allowed_token_types,
    requiredFields: row.required_fields,
    minApprovalCount: row.min_approval_count,
    allowSelfApproval: row.allow_self_approval,
    requireAdminForBreaking: row.require_admin_for_breaking,
    requireMigrationNotesForBreaking: row.require_migration_notes_for_breaking,
  };
}
