export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_request_items: {
        Row: {
          after_value: string | null
          before_value: string | null
          change_request_id: string
          id: string
          kind: Database["public"]["Enums"]["change_request_item_kind"]
          note: string | null
          position: number
          token_id: string | null
          token_level: Database["public"]["Enums"]["token_level"] | null
          token_name: string
          token_type: Database["public"]["Enums"]["token_type"] | null
          workspace_id: string
        }
        Insert: {
          after_value?: string | null
          before_value?: string | null
          change_request_id: string
          id?: string
          kind: Database["public"]["Enums"]["change_request_item_kind"]
          note?: string | null
          position?: number
          token_id?: string | null
          token_level?: Database["public"]["Enums"]["token_level"] | null
          token_name: string
          token_type?: Database["public"]["Enums"]["token_type"] | null
          workspace_id: string
        }
        Update: {
          after_value?: string | null
          before_value?: string | null
          change_request_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["change_request_item_kind"]
          note?: string | null
          position?: number
          token_id?: string | null
          token_level?: Database["public"]["Enums"]["token_level"] | null
          token_name?: string
          token_type?: Database["public"]["Enums"]["token_type"] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_request_items_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_request_items_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_request_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          author_id: string | null
          breaking: boolean
          created_at: string
          description: string | null
          id: string
          migration_notes: string | null
          short_id: string
          stale: boolean
          stale_reason: string | null
          status: Database["public"]["Enums"]["change_request_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          breaking?: boolean
          created_at?: string
          description?: string | null
          id?: string
          migration_notes?: string | null
          short_id: string
          stale?: boolean
          stale_reason?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          breaking?: boolean
          created_at?: string
          description?: string | null
          id?: string
          migration_notes?: string | null
          short_id?: string
          stale?: boolean
          stale_reason?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_tokens: {
        Row: {
          added_at: string
          added_by: string | null
          collection_id: string
          position: number
          token_id: string
          workspace_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          collection_id: string
          position?: number
          token_id: string
          workspace_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          collection_id?: string
          position?: number
          token_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_tokens_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tokens_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          body: string
          change_request_id: string
          created_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          change_request_id: string
          created_at?: string
          id?: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          change_request_id?: string
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      release_change_requests: {
        Row: {
          change_request_id: string
          release_id: string
          workspace_id: string
        }
        Insert: {
          change_request_id: string
          release_id: string
          workspace_id: string
        }
        Update: {
          change_request_id?: string
          release_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_change_requests_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_change_requests_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_change_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      release_locks: {
        Row: {
          expires_at: string
          locked_at: string
          locked_by: string | null
          workspace_id: string
        }
        Insert: {
          expires_at?: string
          locked_at?: string
          locked_by?: string | null
          workspace_id: string
        }
        Update: {
          expires_at?: string
          locked_at?: string
          locked_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_locks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      release_token_snapshots: {
        Row: {
          created_at: string
          deprecated: boolean
          description: string | null
          id: string
          level: Database["public"]["Enums"]["token_level"]
          metadata: Json
          name: string
          release_id: string
          replacement_token_name: string | null
          resolved_value: string
          tags: string[]
          token_id: string | null
          type: Database["public"]["Enums"]["token_type"]
          value: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deprecated?: boolean
          description?: string | null
          id?: string
          level: Database["public"]["Enums"]["token_level"]
          metadata?: Json
          name: string
          release_id: string
          replacement_token_name?: string | null
          resolved_value: string
          tags?: string[]
          token_id?: string | null
          type: Database["public"]["Enums"]["token_type"]
          value: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deprecated?: boolean
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["token_level"]
          metadata?: Json
          name?: string
          release_id?: string
          replacement_token_name?: string | null
          resolved_value?: string
          tags?: string[]
          token_id?: string | null
          type?: Database["public"]["Enums"]["token_type"]
          value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_token_snapshots_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_token_snapshots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_token_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          breaking: boolean
          created_at: string
          id: string
          idempotency_key: string | null
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["release_status"]
          summary: string | null
          version: string
          workspace_id: string
        }
        Insert: {
          breaking?: boolean
          created_at?: string
          id?: string
          idempotency_key?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["release_status"]
          summary?: string | null
          version: string
          workspace_id: string
        }
        Update: {
          breaking?: boolean
          created_at?: string
          id?: string
          idempotency_key?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["release_status"]
          summary?: string | null
          version?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          change_request_id: string
          comment: string | null
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          reviewer_id: string | null
          workspace_id: string
        }
        Insert: {
          change_request_id: string
          comment?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          reviewer_id?: string | null
          workspace_id: string
        }
        Update: {
          change_request_id?: string
          comment?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          reviewer_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_configs: {
        Row: {
          allow_self_approval: boolean
          allowed_token_types: Database["public"]["Enums"]["token_type"][]
          min_approval_count: number
          naming_pattern: string
          require_admin_for_breaking: boolean
          require_migration_notes_for_breaking: boolean
          required_fields: string[]
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          allow_self_approval?: boolean
          allowed_token_types?: Database["public"]["Enums"]["token_type"][]
          min_approval_count?: number
          naming_pattern?: string
          require_admin_for_breaking?: boolean
          require_migration_notes_for_breaking?: boolean
          required_fields?: string[]
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          allow_self_approval?: boolean
          allowed_token_types?: Database["public"]["Enums"]["token_type"][]
          min_approval_count?: number
          naming_pattern?: string
          require_admin_for_breaking?: boolean
          require_migration_notes_for_breaking?: boolean
          required_fields?: string[]
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schema_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      token_references: {
        Row: {
          created_at: string
          id: string
          referenced_token_id: string
          source_token_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referenced_token_id: string
          source_token_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referenced_token_id?: string
          source_token_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_references_referenced_token_id_fkey"
            columns: ["referenced_token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_references_source_token_id_fkey"
            columns: ["source_token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_references_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      token_versions: {
        Row: {
          change_request_id: string | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          release_id: string | null
          resolved_value: string
          token_id: string
          value: string
          workspace_id: string
        }
        Insert: {
          change_request_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          release_id?: string | null
          resolved_value: string
          token_id: string
          value: string
          workspace_id: string
        }
        Update: {
          change_request_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          release_id?: string | null
          resolved_value?: string
          token_id?: string
          value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          created_at: string
          created_by: string | null
          current_resolved_value: string | null
          current_value: string | null
          deprecated: boolean
          description: string | null
          id: string
          level: Database["public"]["Enums"]["token_level"]
          name: string
          replacement_token_id: string | null
          status: Database["public"]["Enums"]["token_status"]
          tags: string[]
          type: Database["public"]["Enums"]["token_type"]
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_resolved_value?: string | null
          current_value?: string | null
          deprecated?: boolean
          description?: string | null
          id?: string
          level: Database["public"]["Enums"]["token_level"]
          name: string
          replacement_token_id?: string | null
          status?: Database["public"]["Enums"]["token_status"]
          tags?: string[]
          type: Database["public"]["Enums"]["token_type"]
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_resolved_value?: string | null
          current_value?: string | null
          deprecated?: boolean
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["token_level"]
          name?: string
          replacement_token_id?: string | null
          status?: Database["public"]["Enums"]["token_status"]
          tags?: string[]
          type?: Database["public"]["Enums"]["token_type"]
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_replacement_token_id_fkey"
            columns: ["replacement_token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          product: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          product?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          product?: string | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      api_key_resolve: {
        Args: { p_hash: string }
        Returns: {
          api_key_id: string
          scopes: string[]
          workspace_id: string
        }[]
      }
      api_key_touch: { Args: { p_id: string }; Returns: undefined }
      create_workspace: {
        Args: { p_name: string; p_product?: string; p_slug: string }
        Returns: string
      }
      invite_accept: { Args: { p_token: string }; Returns: string }
      invite_lookup: {
        Args: { p_token: string }
        Returns: {
          consumed: boolean
          email: string
          expired: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
          workspace_name: string
          workspace_product: string
        }[]
      }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: number }
      notify_user: {
        Args: {
          p_body?: string
          p_entity_id: string
          p_entity_type: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_link?: string
          p_recipient: string
          p_title: string
          ws_id: string
        }
        Returns: undefined
      }
      notify_workspace: {
        Args: {
          p_body?: string
          p_entity_id: string
          p_entity_type: string
          p_exclude_actor?: boolean
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_link?: string
          p_role_at_least?: Database["public"]["Enums"]["workspace_role"]
          p_title: string
          ws_id: string
        }
        Returns: number
      }
      record_audit: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity_id?: string
          p_entity_type: string
          ws_id: string
        }
        Returns: undefined
      }
      release_publish_lock: { Args: { ws_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      try_acquire_release_lock: { Args: { ws_id: string }; Returns: boolean }
      workspace_role_at_least: {
        Args: {
          required: Database["public"]["Enums"]["workspace_role"]
          ws_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      change_request_item_kind:
        | "add"
        | "edit"
        | "rename"
        | "deprecate"
        | "archive"
        | "restore"
        | "delete_draft"
      change_request_status:
        | "draft"
        | "open"
        | "changes_requested"
        | "approved"
        | "published"
        | "rejected"
        | "closed"
      notification_kind:
        | "change_request.submitted"
        | "change_request.approved"
        | "change_request.changes_requested"
        | "release.published"
        | "token.deprecated"
        | "comment.mention"
        | "reviewer.assigned"
      release_status: "draft" | "published" | "archived"
      review_decision: "approve" | "request_changes" | "comment"
      token_level: "primitive" | "semantic" | "component"
      token_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "deprecated"
        | "archived"
      token_type:
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
        | "easing"
      workspace_role: "viewer" | "contributor" | "reviewer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// Convenience aliases used throughout the app code so callers don't have to
// reach through `Database["public"]["Enums"][...]` every time.
export type WorkspaceRole = Enums<"workspace_role">;
export type TokenType = Enums<"token_type">;
export type TokenLevel = Enums<"token_level">;
export type TokenStatus = Enums<"token_status">;
export type ChangeRequestStatus = Enums<"change_request_status">;
export type ChangeRequestItemKind = Enums<"change_request_item_kind">;
export type ReviewDecision = Enums<"review_decision">;
export type ReleaseStatus = Enums<"release_status">;
export type NotificationKind = Enums<"notification_kind">;

// `api_keys.scopes` is a free-form text[]; we constrain it in app code.
export type ApiKeyScope =
  | "tokens:read"
  | "releases:read"
  | "exports:create"
  | "changelog:read";

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      change_request_item_kind: [
        "add",
        "edit",
        "rename",
        "deprecate",
        "archive",
        "restore",
        "delete_draft",
      ],
      change_request_status: [
        "draft",
        "open",
        "changes_requested",
        "approved",
        "published",
        "rejected",
        "closed",
      ],
      notification_kind: [
        "change_request.submitted",
        "change_request.approved",
        "change_request.changes_requested",
        "release.published",
        "token.deprecated",
        "comment.mention",
        "reviewer.assigned",
      ],
      release_status: ["draft", "published", "archived"],
      review_decision: ["approve", "request_changes", "comment"],
      token_level: ["primitive", "semantic", "component"],
      token_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "deprecated",
        "archived",
      ],
      token_type: [
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
      ],
      workspace_role: ["viewer", "contributor", "reviewer", "admin"],
    },
  },
} as const
