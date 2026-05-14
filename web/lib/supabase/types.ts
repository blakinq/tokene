// Hand-rolled to match supabase/migrations/20260514000000_initial_schema.sql.
// Regenerate with `npx supabase gen types typescript --linked > lib/supabase/types.ts`
// once the CLI is linked.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole = "viewer" | "contributor" | "reviewer" | "admin";

export type TokenType =
  | "color"
  | "spacing"
  | "sizing"
  | "radius"
  | "border_width"
  | "typography"
  | "shadow"
  | "opacity"
  | "z_index"
  | "duration"
  | "easing";

export type TokenLevel = "primitive" | "semantic" | "component";

export type TokenStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type ChangeRequestStatus =
  | "draft"
  | "open"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected"
  | "closed";

export type ChangeRequestItemKind =
  | "add"
  | "edit"
  | "rename"
  | "deprecate"
  | "archive"
  | "restore"
  | "delete_draft";

export type ReviewDecision = "approve" | "request_changes" | "comment";

export type ReleaseStatus = "draft" | "published" | "archived";

type Timestamp = string;

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  product: string | null;
  created_at: Timestamp;
  created_by: string | null;
};

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: Timestamp;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Timestamp;
};

type TokenRow = {
  id: string;
  workspace_id: string;
  name: string;
  type: TokenType;
  level: TokenLevel;
  status: TokenStatus;
  description: string | null;
  tags: string[];
  current_value: string | null;
  current_resolved_value: string | null;
  deprecated: boolean;
  replacement_token_id: string | null;
  created_at: Timestamp;
  created_by: string | null;
  updated_at: Timestamp;
  updated_by: string | null;
};

type TokenVersionRow = {
  id: string;
  token_id: string;
  workspace_id: string;
  value: string;
  resolved_value: string;
  metadata: Json;
  release_id: string | null;
  change_request_id: string | null;
  created_at: Timestamp;
  created_by: string | null;
};

type TokenReferenceRow = {
  id: string;
  workspace_id: string;
  source_token_id: string;
  referenced_token_id: string;
  created_at: Timestamp;
};

type ChangeRequestRow = {
  id: string;
  workspace_id: string;
  short_id: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  breaking: boolean;
  stale: boolean;
  stale_reason: string | null;
  author_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

type CommentRow = {
  id: string;
  change_request_id: string;
  workspace_id: string;
  author_id: string | null;
  body: string;
  created_at: Timestamp;
};

type ReleaseLockRow = {
  workspace_id: string;
  locked_by: string | null;
  locked_at: Timestamp;
  expires_at: Timestamp;
};

type ChangeRequestItemRow = {
  id: string;
  change_request_id: string;
  workspace_id: string;
  kind: ChangeRequestItemKind;
  token_id: string | null;
  token_name: string;
  token_type: TokenType | null;
  token_level: TokenLevel | null;
  before_value: string | null;
  after_value: string | null;
  note: string | null;
  position: number;
};

type ReviewRow = {
  id: string;
  change_request_id: string;
  workspace_id: string;
  reviewer_id: string | null;
  decision: ReviewDecision;
  comment: string | null;
  created_at: Timestamp;
};

type ReleaseRow = {
  id: string;
  workspace_id: string;
  version: string;
  status: ReleaseStatus;
  summary: string | null;
  breaking: boolean;
  idempotency_key: string | null;
  published_at: Timestamp | null;
  published_by: string | null;
  created_at: Timestamp;
};

type ReleaseChangeRequestRow = {
  release_id: string;
  change_request_id: string;
  workspace_id: string;
};

type ReleaseTokenSnapshotRow = {
  id: string;
  release_id: string;
  workspace_id: string;
  token_id: string | null;
  name: string;
  type: TokenType;
  level: TokenLevel;
  value: string;
  resolved_value: string;
  description: string | null;
  tags: string[];
  deprecated: boolean;
  replacement_token_name: string | null;
  metadata: Json;
  created_at: Timestamp;
};

type CollectionRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string | null;
};

type CollectionTokenRow = {
  collection_id: string;
  token_id: string;
  workspace_id: string;
  position: number;
  added_at: Timestamp;
  added_by: string | null;
};

type AuditLogRow = {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_value: Json | null;
  after_value: Json | null;
  created_at: Timestamp;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, never>;
  Update: Partial<Row>;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      workspaces: Table<WorkspaceRow>;
      workspace_members: Table<WorkspaceMemberRow>;
      tokens: Table<TokenRow>;
      token_versions: Table<TokenVersionRow>;
      token_references: Table<TokenReferenceRow>;
      change_requests: Table<ChangeRequestRow>;
      change_request_items: Table<ChangeRequestItemRow>;
      reviews: Table<ReviewRow>;
      releases: Table<ReleaseRow>;
      release_change_requests: Table<ReleaseChangeRequestRow>;
      release_token_snapshots: Table<ReleaseTokenSnapshotRow>;
      collections: Table<CollectionRow>;
      collection_tokens: Table<CollectionTokenRow>;
      audit_logs: Table<AuditLogRow>;
      comments: Table<CommentRow>;
      release_locks: Table<ReleaseLockRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      workspace_role_at_least: {
        Args: { ws_id: string; required: WorkspaceRole };
        Returns: boolean;
      };
      record_audit: {
        Args: {
          ws_id: string;
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_before?: Json;
          p_after?: Json;
        };
        Returns: void;
      };
      try_acquire_release_lock: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      release_publish_lock: {
        Args: { ws_id: string };
        Returns: void;
      };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      token_type: TokenType;
      token_level: TokenLevel;
      token_status: TokenStatus;
      change_request_status: ChangeRequestStatus;
      change_request_item_kind: ChangeRequestItemKind;
      review_decision: ReviewDecision;
      release_status: ReleaseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
