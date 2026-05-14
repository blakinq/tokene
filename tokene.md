# TokenOps App Architecture

## 1. Architecture Objective

TokenOps is a multi-tenant web application for managing design system tokens across design and engineering workflows.

The architecture must support:

1. Secure multi-workspace access.
2. Token lifecycle management.
3. Token validation and reference resolution.
4. Review and approval workflows.
5. Immutable versioned releases.
6. Deterministic exports for engineering consumption.
7. Safe imports from external token files.
8. Auditability across critical actions.
9. Future integrations with Figma, GitHub, CI/CD, and documentation platforms.

---

# 2. High-Level System Architecture

```txt
+-------------------------------------------------------------+
|                         Web Client                          |
|  Next.js App                                                |
|  - Token Library                                            |
|  - Token Editor                                             |
|  - Change Requests                                          |
|  - Releases                                                 |
|  - Imports / Exports                                        |
|  - Admin Settings                                           |
+-----------------------------+-------------------------------+
                              |
                              | HTTPS / JSON API
                              v
+-------------------------------------------------------------+
|                         Backend API                         |
|  Node.js / TypeScript                                       |
|  - Auth Middleware                                          |
|  - RBAC Middleware                                          |
|  - Workspace Isolation                                      |
|  - REST API                                                 |
+-----------------------------+-------------------------------+
                              |
        +---------------------+----------------------+-------------------+
        |                    |                       |                   |
        v                    v                       v                   v
+---------------+    +----------------+      +----------------+   +----------------+
| PostgreSQL    |    | Redis          |      | Job Queue      |   | Object Storage |
| Primary DB    |    | Cache / Locks  |      | BullMQ         |   | S3-compatible  |
+---------------+    +----------------+      +----------------+   +----------------+
                                                   |
                                                   v
                                      +--------------------------+
                                      | Background Workers       |
                                      | - Import Worker          |
                                      | - Export Worker          |
                                      | - Notification Worker    |
                                      | - Release Worker         |
                                      +--------------------------+
```

---

# 3. Core Architectural Principles

## 3.1 Workspace Isolation

Every major entity belongs to a workspace.

Workspace-scoped entities include:

1. Tokens
2. Token versions
3. Change requests
4. Releases
5. Comments
6. Imports
7. Exports
8. API keys
9. Audit logs
10. Schema configuration

Every backend query must include `workspace_id` unless accessing global user identity.

## 3.2 Server-Side Authority

The backend is the source of truth for:

1. Permissions
2. Token validation
3. Reference resolution
4. Change request state
5. Release publishing
6. Export generation
7. Audit logging

The frontend may perform client-side validation for usability, but server-side validation is mandatory for every mutation.

## 3.3 Immutable Published Releases

Once a release is published, it cannot be modified.

Any correction requires a new release.

Published releases should store snapshots of token values so exports remain deterministic over time.

## 3.4 Draft-First Mutation Model

Published tokens are never edited directly.

All changes to published tokens must flow through:

```txt
Draft Change -> Change Request -> Review -> Approval -> Release -> Published Snapshot
```

## 3.5 Deterministic Exports

The same release and export configuration must always generate the same output.

Export output should depend only on:

1. Release snapshot
2. Export format
3. Export options
4. Exporter version

## 3.6 Audit Everything Critical

Every security-sensitive or production-impacting action must create an audit log.

Examples:

1. Token created
2. Token edited
3. Change request approved
4. Release published
5. Export generated
6. API key created
7. Schema changed
8. User role changed

---

# 4. System Decomposition

TokenOps should be organized into the following systems:

1. Identity and Access System
2. Workspace System
3. Token System
4. Token Validation System
5. Reference Resolution System
6. Change Request System
7. Review and Approval System
8. Release System
9. Export System
10. Import System
11. Notification System
12. Audit System
13. Search System
14. Admin Configuration System
15. Integration System
16. Observability System

---

# 5. Identity and Access System

## 5.1 Responsibility

Handles authentication, workspace membership, role-based access, session management, and API key access.

## 5.2 Core Capabilities

1. User signup
2. Login
3. Logout
4. Workspace membership
5. Role assignment
6. Invite links
7. API key authentication
8. Permission checks

## 5.3 Main Entities

```txt
User
WorkspaceMember
Invite
Session
ApiKey
```

## 5.4 Roles

```txt
viewer
contributor
reviewer
admin
```

## 5.5 Permission Groups

```txt
token:view
token:create
token:update
token:review
change_request:create
change_request:review
release:create
release:publish
import:create
export:create
schema:update
user:manage
audit:view
api_key:manage
```

## 5.6 Request Authorization Flow

```txt
Request received
  -> Authenticate user or API key
  -> Resolve workspace
  -> Confirm membership
  -> Load role
  -> Check permission
  -> Check entity belongs to workspace
  -> Continue request
```

## 5.7 API Key Rules

API keys should:

1. Belong to one workspace.
2. Be stored only as hashes.
3. Have scopes.
4. Support revocation.
5. Record last usage.
6. Never grant broader access than the workspace.

Recommended MVP scopes:

```txt
tokens:read
releases:read
exports:create
changelog:read
```

---

# 6. Workspace System

## 6.1 Responsibility

Provides tenant boundaries and workspace-level configuration.

## 6.2 Core Capabilities

1. Create workspace
2. Update workspace profile
3. Invite members
4. Remove members
5. Manage roles
6. Store workspace settings

## 6.3 Main Entities

```txt
Workspace
WorkspaceMember
SchemaConfig
NamingRule
ApprovalRule
ExportSetting
NotificationSetting
```

## 6.4 Workspace Configuration

Workspace settings should include:

1. Allowed token types
2. Token naming convention
3. Required metadata fields
4. Approval rules
5. Export defaults
6. Deprecation policy
7. Release versioning strategy
8. Notification preferences

---

# 7. Token System

## 7.1 Responsibility

Manages token identities, metadata, current state, and token versions.

## 7.2 Token Concepts

A token has two layers:

### Token Identity

Stable identity and metadata.

Examples:

```txt
name
type
level
status
description
usage guidance
tags
replacement token
```

### Token Version

Actual value at a point in time.

Examples:

```txt
value
resolved value
metadata
release id
change request id
created by
created at
```

## 7.3 Token Levels

```txt
primitive
semantic
component
```

## 7.4 Supported Token Types

MVP:

1. Color
2. Spacing
3. Sizing
4. Radius
5. Border width
6. Typography
7. Shadow
8. Opacity
9. Z-index
10. Duration
11. Easing

Post-MVP:

1. Breakpoint
2. Asset reference
3. Gradient
4. Component state token
5. Theme-specific token

## 7.5 Token Lifecycle

```txt
draft -> in_review -> approved -> published -> deprecated -> archived
```

## 7.6 Token Read Model

The token library should use an optimized read model containing:

```txt
token id
name
type
level
status
latest value
latest resolved value
deprecated flag
tags
updated at
updated by
```

This can be backed by either:

1. A database view
2. A materialized view
3. A denormalized `token_current_state` table

For MVP, a database view is acceptable.

For larger deployments, use a denormalized table updated transactionally during publish.

---

# 8. Token Validation System

## 8.1 Responsibility

Validates token names, values, references, schema, duplication, deprecation, and breaking changes.

## 8.2 Validation Entry Points

Validation runs when:

1. Creating a token draft
2. Editing a token
3. Submitting a change request
4. Reviewing a change request
5. Publishing a release
6. Importing tokens
7. Generating exports

## 8.3 Validation Pipeline

```txt
Normalize input
  -> Validate required fields
  -> Validate token name
  -> Validate token type
  -> Validate token value
  -> Validate references
  -> Resolve values
  -> Detect circular references
  -> Detect duplicates
  -> Detect deprecated references
  -> Detect breaking changes
  -> Return validation result
```

## 8.4 Validation Result Shape

```ts
type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

 type ValidationIssue = {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  tokenName?: string;
  tokenId?: string;
};
```

## 8.5 Validation Severity Rules

### Error

Blocks save, submit, approval, or publish.

Examples:

1. Invalid token name
2. Duplicate active token name
3. Invalid value type
4. Missing required field
5. Invalid reference
6. Circular reference

### Warning

Allows save but requires visibility.

Examples:

1. Missing usage guidance
2. Deprecated token reference
3. Breaking change
4. No replacement for deprecated token

### Info

Provides advisory context.

Examples:

1. Token has many dependents
2. Token value matches existing token
3. Export name differs from token name

---

# 9. Reference Resolution System

## 9.1 Responsibility

Resolves `{token.name}` references into final values and tracks dependency relationships.

## 9.2 Reference Syntax

```txt
{color.blue.600}
{space.400}
{font.size.md}
```

## 9.3 Resolution Rules

1. References may be nested.
2. References must point to existing tokens.
3. References must not create circular chains.
4. References should be type-compatible.
5. Resolved values should be cached for published releases.

## 9.4 Resolution Algorithm

```txt
Start with token value
  -> Extract references
  -> For each reference, load referenced token
  -> Add source -> referenced relationship
  -> Resolve referenced token recursively
  -> Track visited tokens
  -> Stop if visited token appears twice
  -> Return final resolved value
```

## 9.5 Example Dependency Chain

```txt
button.primary.background.default
  -> color.background.brand
  -> color.blue.600
  -> #005FCC
```

## 9.6 Dependency Storage

Store direct dependencies in `token_references`.

For graph queries, support:

1. Direct references
2. Direct dependents
3. Full dependency chain
4. Full impact graph

MVP can compute full chains at request time.

Post-MVP can precompute graph edges and closure tables.

---

# 10. Change Request System

## 10.1 Responsibility

Groups proposed token changes into reviewable units.

## 10.2 Core Capabilities

1. Create change request
2. Add token changes
3. Edit draft change request
4. Submit for review
5. Show token diffs
6. Show visual diffs
7. Show validation results
8. Track comments
9. Track status

## 10.3 Change Request Lifecycle

```txt
draft -> open -> changes_requested -> open -> approved -> published
```

Alternative terminal states:

```txt
open -> rejected
open -> closed
changes_requested -> closed
approved -> closed
```

## 10.4 Change Request Item Types

```txt
add
edit
rename
deprecate
archive
restore
delete_draft
```

## 10.5 Change Request Validation

The system validates:

1. Each individual change item
2. Combined effect of all items
3. Reference graph after all changes
4. Duplicate names after renames
5. Breaking changes
6. Required migration notes

## 10.6 Conflict Handling

A change request becomes stale if:

1. A token it changes was modified by another published release.
2. A referenced token was removed or renamed.
3. A schema rule changed after the request was created.

Stale requests must be revalidated before approval.

---

# 11. Review and Approval System

## 11.1 Responsibility

Controls approval rules before token changes can be released.

## 11.2 Review Actions

```txt
approve
reject
request_changes
comment
assign_reviewer
remove_reviewer
```

## 11.3 Approval Rules

Workspace admins can configure:

1. Minimum approval count
2. Whether authors can approve their own changes
3. Required admin approval for breaking changes
4. Required reviewer role
5. Required migration notes for breaking changes

## 11.4 Approval Decision Flow

```txt
Reviewer submits decision
  -> Confirm reviewer permission
  -> Confirm request is open
  -> Re-run validation
  -> Block approval if validation has errors
  -> Apply decision
  -> Update request state
  -> Create audit log
  -> Send notifications
```

---

# 12. Release System

## 12.1 Responsibility

Publishes approved change requests into immutable versioned token snapshots.

## 12.2 Core Capabilities

1. Create release draft
2. Select approved change requests
3. Validate combined release
4. Suggest version bump
5. Generate changelog
6. Publish release
7. Store release snapshot
8. Expose release to exports and API

## 12.3 Release Lifecycle

```txt
draft -> published -> archived
```

## 12.4 Release Publish Flow

```txt
Admin clicks publish
  -> Confirm permission
  -> Lock workspace release publishing
  -> Load selected change requests
  -> Confirm all are approved
  -> Validate combined token graph
  -> Detect breaking changes
  -> Confirm version number
  -> Generate changelog
  -> Create immutable release snapshot
  -> Update token current state
  -> Mark change requests as published
  -> Create audit logs
  -> Send notifications
  -> Release lock
```

## 12.5 Release Snapshot

A release snapshot should store:

1. Token id
2. Token name
3. Token type
4. Token level
5. Raw value
6. Resolved value
7. Description
8. Usage guidance
9. Tags
10. Deprecated flag
11. Replacement token
12. Export-safe metadata

Recommended table:

```txt
release_token_snapshots
```

Fields:

```txt
id
release_id
workspace_id
token_id
name
type
level
value
resolved_value
metadata
status
deprecated
replacement_token_id
created_at
```

---

# 13. Export System

## 13.1 Responsibility

Generates implementation-ready token files from published release snapshots.

## 13.2 MVP Formats

1. JSON
2. Style Dictionary JSON
3. CSS variables
4. SCSS variables
5. TypeScript constants

## 13.3 Post-MVP Formats

1. Android XML
2. iOS Swift
3. Kotlin
4. Tailwind config
5. Design Tokens Community Group format

## 13.4 Export Flow

```txt
User requests export
  -> Confirm permission
  -> Create export job
  -> Queue export worker
  -> Load release snapshot
  -> Apply filters
  -> Resolve or preserve references
  -> Transform names
  -> Generate file
  -> Store file in object storage
  -> Update job status
  -> Create audit log
  -> Notify user
```

## 13.5 Export Options

```ts
type ExportOptions = {
  releaseId: string;
  format: 'json' | 'style_dictionary' | 'css' | 'scss' | 'typescript';
  includeDeprecated: boolean;
  resolveReferences: boolean;
  includeMetadata: boolean;
  categories?: string[];
  levels?: string[];
  prefix?: string;
};
```

## 13.6 Exporter Interface

```ts
interface TokenExporter {
  format: string;
  extension: string;
  contentType: string;
  export(tokens: TokenSnapshot[], options: ExportOptions): Promise<string>;
}
```

## 13.7 Deterministic Export Rules

1. Sort tokens by name.
2. Use stable formatting.
3. Normalize line endings.
4. Use stable object key ordering.
5. Include exporter version in export metadata when metadata is enabled.

---

# 14. Import System

## 14.1 Responsibility

Safely imports token files and converts them into draft changes.

## 14.2 MVP Import Formats

1. JSON
2. Style Dictionary JSON

## 14.3 Import Flow

```txt
User uploads file
  -> Confirm permission
  -> Store raw file
  -> Create import job
  -> Queue import worker
  -> Parse file
  -> Normalize token shape
  -> Validate tokens
  -> Detect conflicts
  -> Save parsed result
  -> User reviews import
  -> User submits import as change request
```

## 14.4 Import Conflict Types

```txt
new_token
duplicate_unchanged
duplicate_changed
invalid_token
missing_reference
unknown_category
unsupported_type
```

## 14.5 Import Parser Interface

```ts
interface TokenImporter {
  format: string;
  parse(input: string): Promise<ParsedToken[]>;
}
```

## 14.6 Import Safety Rules

1. Limit file size.
2. Reject executable files.
3. Validate MIME type.
4. Parse in worker process.
5. Never publish imported tokens directly.
6. Imports must create drafts or change requests.

---

# 15. Notification System

## 15.1 Responsibility

Sends relevant workflow notifications.

## 15.2 MVP Channels

1. In-app notification center
2. Email

## 15.3 Notification Events

1. Reviewer assigned
2. Change request submitted
3. Change request approved
4. Changes requested
5. Comment mention
6. Release published
7. Import completed
8. Export completed
9. Export failed
10. Token deprecated

## 15.4 Notification Flow

```txt
Domain event occurs
  -> Create notification records
  -> Queue notification worker
  -> Send email if enabled
  -> Mark delivery status
```

---

# 16. Audit System

## 16.1 Responsibility

Creates tamper-resistant records of important actions.

## 16.2 Audit Events

```txt
user.invited
user.role_changed
token.created
token.updated
token.deprecated
token.archived
change_request.created
change_request.submitted
change_request.approved
change_request.rejected
release.created
release.published
import.created
export.created
schema.updated
api_key.created
api_key.revoked
```

## 16.3 Audit Log Shape

```ts
type AuditLog = {
  id: string;
  workspaceId: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};
```

## 16.4 Audit Rules

1. Audit writes should happen inside the same transaction as the action when possible.
2. Audit logs should not be editable by users.
3. Audit logs should be filterable by actor, action, entity, and date.
4. Sensitive values should be redacted.

---

# 17. Search System

## 17.1 Responsibility

Supports fast discovery of tokens, change requests, releases, and audit entries.

## 17.2 MVP Search

Use PostgreSQL search with indexes.

Supported token search fields:

1. Name
2. Description
3. Value
4. Tags
5. Type
6. Level
7. Status

## 17.3 Recommended Indexes

```sql
CREATE INDEX tokens_workspace_name_idx ON tokens(workspace_id, name);
CREATE INDEX tokens_workspace_type_idx ON tokens(workspace_id, type);
CREATE INDEX tokens_workspace_status_idx ON tokens(workspace_id, status);
CREATE INDEX tokens_tags_idx ON tokens USING GIN(tags);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX tokens_name_trgm_idx ON tokens USING GIN(name gin_trgm_ops);
```

## 17.4 Post-MVP Search

Use a dedicated search engine if token count or search complexity grows.

Options:

1. Typesense
2. Meilisearch
3. Elasticsearch
4. OpenSearch

---

# 18. Admin Configuration System

## 18.1 Responsibility

Allows workspace admins to configure token governance.

## 18.2 Configurable Areas

1. Token types
2. Token categories
3. Naming conventions
4. Required metadata fields
5. Approval rules
6. Export defaults
7. Deprecation requirements
8. Notification settings
9. API key scopes
10. Integration settings

## 18.3 Schema Configuration Example

```json
{
  "allowedTokenTypes": ["color", "spacing", "radius", "typography", "shadow"],
  "requiredFields": ["name", "type", "value", "description"],
  "namingPattern": "^[a-z]+(\\.[a-z0-9]+)+$",
  "allowDeprecatedReferences": false,
  "requireReplacementForDeprecation": true
}
```

---

# 19. Integration System

## 19.1 Responsibility

Connects TokenOps with external design and engineering tools.

## 19.2 MVP Integrations

1. API keys
2. Export download URL
3. Manual JSON import
4. Style Dictionary-compatible export

## 19.3 Post-MVP Integrations

1. Figma variables import
2. Figma plugin
3. GitHub pull request creation
4. GitLab support
5. Storybook token documentation
6. Slack notifications
7. CI/CD webhooks
8. npm package publishing

## 19.4 Integration Design Rule

Integrations should be adapters around core domain services.

They must not bypass:

1. Validation
2. Permissions
3. Change requests
4. Release publishing
5. Audit logging

---

# 20. Observability System

## 20.1 Responsibility

Tracks application health, system performance, and failures.

## 20.2 Logs

Use structured logs for:

1. API requests
2. Auth failures
3. Permission denials
4. Validation failures
5. Import failures
6. Export failures
7. Release publish failures
8. Worker crashes

## 20.3 Metrics

Track:

1. API latency
2. Error rate
3. Token validation duration
4. Export duration
5. Import duration
6. Queue depth
7. Database query latency
8. Cache hit rate
9. Release publish duration

## 20.4 Traces

Use distributed tracing for:

1. Release publishing
2. Import processing
3. Export generation
4. Token validation
5. Reference resolution

---

# 21. Data Architecture

## 21.1 Primary Database

Use PostgreSQL as the primary system of record.

PostgreSQL stores:

1. Users
2. Workspaces
3. Tokens
4. Token versions
5. Token references
6. Change requests
7. Reviews
8. Releases
9. Release snapshots
10. Comments
11. Audit logs
12. Import jobs
13. Export jobs
14. API keys
15. Notifications
16. Schema configuration

## 21.2 Cache

Use Redis for:

1. Session cache if needed
2. Rate limits
3. Publish locks
4. Export job state cache
5. Frequently accessed release snapshots
6. Short-lived token search result cache

## 21.3 Object Storage

Use S3-compatible object storage for:

1. Uploaded import files
2. Generated export files
3. Large export artifacts
4. Future integration payloads

## 21.4 Queue

Use BullMQ or equivalent for:

1. Import parsing
2. Export generation
3. Notification delivery
4. Future GitHub PR generation
5. Future Figma sync jobs

---

# 22. Database Model Summary

## 22.1 Core Tables

```txt
users
workspaces
workspace_members
schema_configs
tokens
token_versions
token_references
change_requests
change_request_items
reviews
releases
release_items
release_token_snapshots
comments
import_jobs
export_jobs
audit_logs
api_keys
notifications
```

## 22.2 Important Relationships

```txt
Workspace 1 -> many Tokens
Workspace 1 -> many ChangeRequests
Workspace 1 -> many Releases
Workspace 1 -> many WorkspaceMembers

Token 1 -> many TokenVersions
Token 1 -> many TokenReferences as source
Token 1 -> many TokenReferences as referenced

ChangeRequest 1 -> many ChangeRequestItems
ChangeRequest 1 -> many Reviews
ChangeRequest 1 -> many Comments

Release 1 -> many ReleaseItems
Release 1 -> many ReleaseTokenSnapshots
```

---

# 23. Backend API Architecture

## 23.1 API Style

Use REST for MVP.

Reasons:

1. Easier for external consumers.
2. Simple API key access.
3. Straightforward caching.
4. Clear resource boundaries.
5. Good fit for exports and releases.

GraphQL can be added later for complex internal UI queries.

## 23.2 API Namespace

```txt
/api/v1
```

## 23.3 Core API Groups

```txt
/auth
/users
/workspaces
/workspaces/:workspaceId/members
/workspaces/:workspaceId/tokens
/workspaces/:workspaceId/change-requests
/workspaces/:workspaceId/releases
/workspaces/:workspaceId/imports
/workspaces/:workspaceId/exports
/workspaces/:workspaceId/audit-logs
/workspaces/:workspaceId/settings
/workspaces/:workspaceId/api-keys
```

## 23.4 API Middleware Order

```txt
Request logging
  -> Rate limiting
  -> Body parsing
  -> Authentication
  -> Workspace resolution
  -> RBAC authorization
  -> Request validation
  -> Controller
  -> Response formatting
  -> Audit logging where needed
```

---

# 24. Frontend Architecture

## 24.1 Frontend Framework

Use Next.js with TypeScript.

## 24.2 Frontend Responsibilities

1. Route rendering
2. Auth-aware navigation
3. Token browsing UI
4. Token preview UI
5. Draft editing UI
6. Change request diff UI
7. Release publishing UI
8. Import review UI
9. Export configuration UI
10. Admin settings UI

## 24.3 Suggested App Structure

```txt
app/
  dashboard/
  tokens/
    page.tsx
    new/
      page.tsx
    [tokenId]/
      page.tsx
  change-requests/
    page.tsx
    [changeRequestId]/
      page.tsx
  releases/
    page.tsx
    [releaseId]/
      page.tsx
  imports/
    page.tsx
    [importId]/
      page.tsx
  exports/
    page.tsx
  settings/
    page.tsx

components/
  tokens/
  previews/
  change-requests/
  releases/
  imports/
  exports/
  settings/
  shared/

lib/
  api/
  auth/
  permissions/
  validation/
  token-formatters/
  export-preview/
```

## 24.4 Frontend State

Use:

1. Server state: TanStack Query
2. Forms: React Hook Form
3. Validation: Zod
4. Local UI state: React state or Zustand for complex panels
5. URL state: filters, sorting, search, pagination

## 24.5 Key Frontend Components

### Token Components

```txt
TokenTable
TokenGrid
TokenFilters
TokenSearch
TokenPreview
TokenStatusBadge
TokenDetailHeader
TokenReferenceGraph
TokenHistoryTimeline
```

### Change Request Components

```txt
ChangeRequestList
ChangeRequestStatusBadge
TokenDiffViewer
VisualDiffViewer
ValidationSummary
ReviewPanel
ReviewerSelector
```

### Release Components

```txt
ReleaseList
ReleaseSummary
ChangelogViewer
ReleaseNotesEditor
VersionBumpSelector
PublishReleaseDialog
```

### Import / Export Components

```txt
ImportUploader
ImportPreviewTable
ImportConflictResolver
ExportFormatSelector
ExportOptionsPanel
ExportJobStatus
```

---

# 25. Worker Architecture

## 25.1 Worker Types

```txt
import-worker
export-worker
notification-worker
release-worker
integration-worker
```

## 25.2 Import Worker

Responsibilities:

1. Load uploaded file
2. Parse file
3. Normalize tokens
4. Validate tokens
5. Detect conflicts
6. Store parsed result
7. Update import job status

## 25.3 Export Worker

Responsibilities:

1. Load release snapshot
2. Apply export options
3. Generate export content
4. Store generated file
5. Update export job status
6. Notify requester

## 25.4 Notification Worker

Responsibilities:

1. Load pending notifications
2. Send email
3. Update delivery status
4. Retry failures

## 25.5 Release Worker

MVP can publish releases synchronously inside the API request if release size is small.

For scale, move publishing into a worker.

Release worker responsibilities:

1. Validate selected change requests
2. Build release snapshot
3. Update current token state
4. Mark change requests as published
5. Notify users

---

# 26. Critical Data Flows

## 26.1 Create Token Draft

```txt
User submits token form
  -> Frontend validates basic fields
  -> POST /tokens
  -> Backend checks permission
  -> Backend validates token
  -> Backend creates token in draft status
  -> Backend creates initial token version
  -> Backend creates audit log
  -> Response returns token id
```

## 26.2 Submit Change Request

```txt
User creates change request
  -> Adds token changes
  -> Submits for review
  -> Backend checks permission
  -> Backend validates all change items
  -> Backend computes combined graph
  -> Backend detects breaking changes
  -> Status changes to open
  -> Reviewers are notified
  -> Audit log created
```

## 26.3 Approve Change Request

```txt
Reviewer approves
  -> Backend checks reviewer permission
  -> Backend confirms request is open
  -> Backend reruns validation
  -> Backend blocks approval if errors exist
  -> Review record is created
  -> Approval rule is evaluated
  -> Request status becomes approved if rule passes
  -> Author is notified
  -> Audit log created
```

## 26.4 Publish Release

```txt
Admin creates release draft
  -> Selects approved change requests
  -> Clicks publish
  -> Backend acquires workspace publish lock
  -> Backend validates all changes together
  -> Backend creates release snapshot
  -> Backend updates current token state
  -> Backend marks requests as published
  -> Backend generates changelog
  -> Backend releases lock
  -> Notifications sent
  -> Audit logs created
```

## 26.5 Generate Export

```txt
User selects release and format
  -> Backend creates export job
  -> Export worker loads release snapshot
  -> Export worker applies options
  -> Export worker generates file
  -> File stored in object storage
  -> Job marked completed
  -> User receives download link
```

## 26.6 Import Tokens

```txt
User uploads token file
  -> Raw file stored in object storage
  -> Import job created
  -> Import worker parses file
  -> Tokens normalized
  -> Validation runs
  -> Conflicts detected
  -> Results shown to user
  -> User submits selected changes as change request
```

---

# 27. Deployment Architecture

## 27.1 MVP Deployment

```txt
Vercel
  -> Next.js frontend

Managed API Host
  -> Node.js backend
  -> Background workers

Managed PostgreSQL
Managed Redis
S3-compatible storage
```

## 27.2 Production Deployment

```txt
CDN
  -> Web app
  -> API load balancer
      -> API containers
      -> Worker containers
  -> PostgreSQL primary
  -> PostgreSQL read replica, optional
  -> Redis
  -> Object storage
  -> Observability stack
```

## 27.3 Environments

```txt
local
development
staging
production
```

## 27.4 Environment Rules

1. Production data must never be used locally without anonymization.
2. Staging should mirror production configuration.
3. All migrations run first in staging.
4. Feature flags should gate risky changes.
5. Secrets must be managed through a secret manager.

---

# 28. Security Architecture

## 28.1 Authentication

MVP options:

1. Auth.js
2. Clerk
3. WorkOS
4. Custom session auth

Recommended for B2B readiness: WorkOS or Clerk.

## 28.2 Authorization

Enforce authorization in backend services, not only controllers.

Every mutation should check:

1. Authenticated identity
2. Workspace membership
3. Role permission
4. Entity workspace ownership
5. Entity state transition validity

## 28.3 Data Isolation

All workspace-owned tables should include `workspace_id`.

Use tests to ensure cross-workspace data access is blocked.

## 28.4 API Key Security

1. Store only hashed key.
2. Show full key only once.
3. Support scopes.
4. Support expiration post-MVP.
5. Support revocation.
6. Log usage.

## 28.5 Upload Security

1. File size limit
2. MIME validation
3. JSON parsing limits
4. Reject executable files
5. Store uploads privately
6. Signed URLs for access

---

# 29. Performance Architecture

## 29.1 Targets

```txt
Token library load: < 2s for 5,000 tokens
Search: < 500ms
Token detail: < 1s
Single token validation: < 100ms
Release publish: < 10s for 10,000 tokens
Export generation: < 10s for 10,000 tokens
```

## 29.2 Performance Strategies

1. Cursor pagination
2. Indexed filters
3. Cached release snapshots
4. Async exports
5. Async imports
6. Precomputed resolved values
7. Optimized token current-state read model
8. Debounced search
9. Lazy-loaded dependency graphs
10. Virtualized token tables

---

# 30. Reliability Architecture

## 30.1 Transaction Boundaries

Use database transactions for:

1. Creating token + token version
2. Submitting change request
3. Approving review
4. Publishing release
5. Updating workspace settings
6. Creating audit logs alongside mutations

## 30.2 Locking

Use Redis or PostgreSQL advisory locks for release publishing.

Only one release should publish per workspace at a time.

Lock key:

```txt
workspace:{workspaceId}:release_publish
```

## 30.3 Job Retries

Background jobs should support:

1. Retry count
2. Exponential backoff
3. Dead-letter queue
4. Error recording
5. Manual retry from admin UI

## 30.4 Idempotency

Important operations should support idempotency keys:

1. Create export job
2. Create import job
3. Publish release
4. Send notification
5. Create GitHub PR post-MVP

---

# 31. Suggested Monorepo Structure

```txt
tokenops/
  apps/
    web/
    api/
    worker/
  packages/
    database/
    config/
    auth/
    permissions/
    token-core/
    validation-core/
    export-core/
    import-core/
    ui/
    types/
  tooling/
    eslint-config/
    tsconfig/
  prisma/
    schema.prisma
  docker-compose.yml
  package.json
```

## 31.1 Package Responsibilities

### `token-core`

1. Token types
2. Token normalization
3. Token name utilities
4. Reference parsing
5. Token diff utilities

### `validation-core`

1. Validation pipeline
2. Validation issue types
3. Name validation
4. Value validation
5. Reference validation
6. Breaking change detection

### `export-core`

1. Exporter interface
2. JSON exporter
3. CSS exporter
4. SCSS exporter
5. TypeScript exporter
6. Style Dictionary exporter

### `import-core`

1. Importer interface
2. JSON parser
3. Style Dictionary parser
4. Import normalization
5. Conflict detection

### `permissions`

1. Role definitions
2. Permission map
3. Permission helper functions

### `database`

1. Prisma schema
2. Database client
3. Migrations
4. Seed scripts

---

# 32. Domain Events

## 32.1 Event List

```txt
TokenCreated
TokenUpdated
TokenDeprecated
ChangeRequestCreated
ChangeRequestSubmitted
ChangeRequestApproved
ChangeRequestRejected
ReleaseCreated
ReleasePublished
ImportCompleted
ExportCompleted
UserInvited
UserRoleChanged
SchemaUpdated
```

## 32.2 Event Uses

Domain events should trigger:

1. Notifications
2. Audit logs
3. Cache invalidation
4. Search index updates
5. Integration webhooks post-MVP

## 32.3 Event Shape

```ts
type DomainEvent = {
  id: string;
  type: string;
  workspaceId: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};
```

---

# 33. Release Snapshot Strategy

## 33.1 Why Snapshots Matter

Snapshots ensure that a release export remains stable even if token metadata changes later.

Without snapshots, old exports could unintentionally change.

## 33.2 Snapshot Creation

When a release is published:

1. Start from latest published token state.
2. Apply approved change requests in deterministic order.
3. Resolve references.
4. Store final token set in `release_token_snapshots`.
5. Mark release as published.

## 33.3 Snapshot Export

Exports should read from `release_token_snapshots`, not from live `tokens` and `token_versions` tables.

---

# 34. API Endpoint Map

## 34.1 Tokens

```txt
GET    /api/v1/workspaces/:workspaceId/tokens
POST   /api/v1/workspaces/:workspaceId/tokens
GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId
POST   /api/v1/workspaces/:workspaceId/tokens/validate
GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId/history
GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId/references
GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId/dependents
```

## 34.2 Change Requests

```txt
GET    /api/v1/workspaces/:workspaceId/change-requests
POST   /api/v1/workspaces/:workspaceId/change-requests
GET    /api/v1/workspaces/:workspaceId/change-requests/:id
PATCH  /api/v1/workspaces/:workspaceId/change-requests/:id
POST   /api/v1/workspaces/:workspaceId/change-requests/:id/submit
POST   /api/v1/workspaces/:workspaceId/change-requests/:id/reviews
POST   /api/v1/workspaces/:workspaceId/change-requests/:id/comments
```

## 34.3 Releases

```txt
GET    /api/v1/workspaces/:workspaceId/releases
POST   /api/v1/workspaces/:workspaceId/releases
GET    /api/v1/workspaces/:workspaceId/releases/:releaseId
POST   /api/v1/workspaces/:workspaceId/releases/:releaseId/publish
GET    /api/v1/workspaces/:workspaceId/releases/:releaseId/changelog
GET    /api/v1/workspaces/:workspaceId/releases/latest
```

## 34.4 Imports

```txt
GET    /api/v1/workspaces/:workspaceId/imports
POST   /api/v1/workspaces/:workspaceId/imports
GET    /api/v1/workspaces/:workspaceId/imports/:jobId
POST   /api/v1/workspaces/:workspaceId/imports/:jobId/create-change-request
```

## 34.5 Exports

```txt
GET    /api/v1/workspaces/:workspaceId/exports
POST   /api/v1/workspaces/:workspaceId/exports
GET    /api/v1/workspaces/:workspaceId/exports/:jobId
```

## 34.6 Admin

```txt
GET    /api/v1/workspaces/:workspaceId/settings
PATCH  /api/v1/workspaces/:workspaceId/settings
GET    /api/v1/workspaces/:workspaceId/members
POST   /api/v1/workspaces/:workspaceId/invites
PATCH  /api/v1/workspaces/:workspaceId/members/:memberId
DELETE /api/v1/workspaces/:workspaceId/members/:memberId
GET    /api/v1/workspaces/:workspaceId/audit-logs
GET    /api/v1/workspaces/:workspaceId/api-keys
POST   /api/v1/workspaces/:workspaceId/api-keys
DELETE /api/v1/workspaces/:workspaceId/api-keys/:apiKeyId
```

---

# 35. MVP Architecture Boundary

## 35.1 Build Now

1. Monorepo
2. Web app
3. Backend API
4. PostgreSQL schema
5. Auth and RBAC
6. Token system
7. Validation system
8. Reference resolution
9. Change requests
10. Reviews
11. Releases
12. Release snapshots
13. JSON/CSS/SCSS/TypeScript exports
14. JSON imports
15. Audit logs
16. Basic notifications

## 35.2 Defer

1. Figma plugin
2. GitHub PR automation
3. Multi-brand theming
4. Advanced usage analytics
5. Storybook integration
6. Native mobile exports
7. Dedicated search engine
8. Real-time collaboration
9. Visual regression testing
10. npm package publishing

---

# 36. Recommended First Build Slice

Build the smallest vertical architecture slice that proves the product loop.

## Slice: Color Token to CSS Export

### User Flow

```txt
Admin creates workspace
  -> Contributor creates primitive color token
  -> Contributor creates semantic color token referencing primitive token
  -> Contributor submits change request
  -> Reviewer approves
  -> Admin publishes release
  -> Engineer exports CSS variables
```

### Systems Exercised

1. Auth
2. Workspace membership
3. RBAC
4. Token creation
5. Reference resolution
6. Validation
7. Change requests
8. Review workflow
9. Release snapshots
10. Export generation
11. Audit logging

### Deliverable

A working end-to-end flow that outputs:

```css
:root {
  --color-blue-600: #005FCC;
  --color-background-brand: #005FCC;
}
```

---

# 37. Architecture Decision Records

## ADR-001: Use PostgreSQL as primary database

Decision: Use PostgreSQL for all relational and JSON token data.

Reason:

1. Strong relational integrity.
2. JSONB support for flexible token values.
3. Transaction support.
4. Good indexing.
5. Mature ecosystem.

## ADR-002: Use release snapshots

Decision: Store immutable token snapshots per release.

Reason:

1. Deterministic exports.
2. Historical accuracy.
3. Safer rollbacks.
4. Easier API consumption by version.

## ADR-003: Use REST for MVP

Decision: Use REST APIs for the MVP.

Reason:

1. Easier external consumption.
2. Clear resource model.
3. Simpler API key use.
4. Better fit for exports.

## ADR-004: Use background workers for imports and exports

Decision: Process imports and exports asynchronously.

Reason:

1. Prevents long API requests.
2. Improves reliability.
3. Supports retries.
4. Allows scaling workers separately.

## ADR-005: Use draft-first token mutation model

Decision: Published token changes must go through change requests and releases.

Reason:

1. Prevents accidental production changes.
2. Supports review.
3. Creates clear history.
4. Improves engineering trust.

---

# 38. Final Architecture Summary

TokenOps should be built as a modular, multi-tenant web application with a Next.js frontend, TypeScript backend, PostgreSQL database, Redis cache, background workers, and S3-compatible object storage.

The core domain should revolve around immutable release snapshots, validated token changes, reference resolution, and deterministic exports.

The most important architectural rule is that published tokens are not directly edited. All changes should flow through validation, change requests, review, release publishing, and export generation.

This architecture gives designers a safe visual workflow and engineers a reliable production-grade token pipeline.

