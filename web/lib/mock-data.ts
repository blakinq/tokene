export type TokenType =
  | "color"
  | "spacing"
  | "sizing"
  | "radius"
  | "border-width"
  | "typography"
  | "shadow"
  | "opacity"
  | "z-index"
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

export type Token = {
  id: string;
  name: string;
  type: TokenType;
  level: TokenLevel;
  status: TokenStatus;
  value: string;
  resolvedValue: string;
  description?: string;
  tags: string[];
  dependents: number;
  references: string[];
  updatedAt: string;
  updatedBy: string;
  deprecated?: boolean;
  replacementToken?: string;
};

export type ChangeRequestStatus =
  | "draft"
  | "open"
  | "changes_requested"
  | "approved"
  | "published"
  | "rejected"
  | "closed";

export type ChangeRequest = {
  id: string;
  shortId: string;
  title: string;
  description: string;
  author: { name: string; avatar?: string };
  status: ChangeRequestStatus;
  itemCount: number;
  breaking: boolean;
  validation: { errors: number; warnings: number };
  reviewers: { name: string; decision?: "approve" | "changes" | "pending" }[];
  comments: number;
  updatedAt: string;
};

export type Release = {
  id: string;
  version: string;
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  publishedBy?: string;
  tokenCount: number;
  changeCount: number;
  breaking: boolean;
  summary: string;
};

export type ImportJob = {
  id: string;
  filename: string;
  format: "JSON" | "Style Dictionary";
  status: "queued" | "parsing" | "ready" | "applied" | "failed";
  uploadedBy: string;
  uploadedAt: string;
  tokensParsed: number;
  conflicts: number;
};

export type ExportJob = {
  id: string;
  release: string;
  format: "JSON" | "Style Dictionary" | "CSS" | "SCSS" | "TypeScript";
  status: "queued" | "running" | "ready" | "failed";
  createdBy: string;
  createdAt: string;
  size?: string;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
};

export const workspace = {
  name: "Acme",
  slug: "acme",
  product: "Core",
  members: 24,
  plan: "Team",
};

export const tokens: Token[] = [
  {
    id: "tok_01",
    name: "color.blue.500",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#1F7AE0",
    resolvedValue: "#1F7AE0",
    description: "Brand-aligned mid blue, used in primary actions.",
    tags: ["brand", "blue"],
    dependents: 4,
    references: [],
    updatedAt: "2026-05-09T10:14:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_02",
    name: "color.blue.600",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#005FCC",
    resolvedValue: "#005FCC",
    description: "Deep blue for hover and pressed states.",
    tags: ["brand", "blue"],
    dependents: 6,
    references: [],
    updatedAt: "2026-05-09T10:14:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_03",
    name: "color.gray.50",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#F7F7F8",
    resolvedValue: "#F7F7F8",
    tags: ["neutral"],
    dependents: 12,
    references: [],
    updatedAt: "2026-04-22T08:30:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_04",
    name: "color.gray.900",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#111317",
    resolvedValue: "#111317",
    tags: ["neutral"],
    dependents: 18,
    references: [],
    updatedAt: "2026-04-22T08:30:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_05",
    name: "color.red.500",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#E5484D",
    resolvedValue: "#E5484D",
    tags: ["danger"],
    dependents: 3,
    references: [],
    updatedAt: "2026-03-18T14:02:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_06",
    name: "color.green.500",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#2A9D6A",
    resolvedValue: "#2A9D6A",
    tags: ["success"],
    dependents: 2,
    references: [],
    updatedAt: "2026-03-18T14:02:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_07",
    name: "color.amber.500",
    type: "color",
    level: "primitive",
    status: "published",
    value: "#E0A100",
    resolvedValue: "#E0A100",
    tags: ["warning"],
    dependents: 2,
    references: [],
    updatedAt: "2026-03-18T14:02:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_08",
    name: "color.background.brand",
    type: "color",
    level: "semantic",
    status: "published",
    value: "{color.blue.600}",
    resolvedValue: "#005FCC",
    description: "Use for the surface color of primary brand actions.",
    tags: ["brand", "surface"],
    dependents: 3,
    references: ["color.blue.600"],
    updatedAt: "2026-05-09T10:14:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_09",
    name: "color.background.danger",
    type: "color",
    level: "semantic",
    status: "published",
    value: "{color.red.500}",
    resolvedValue: "#E5484D",
    tags: ["danger", "surface"],
    dependents: 1,
    references: ["color.red.500"],
    updatedAt: "2026-03-18T14:02:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_10",
    name: "color.background.success",
    type: "color",
    level: "semantic",
    status: "published",
    value: "{color.green.500}",
    resolvedValue: "#2A9D6A",
    tags: ["success", "surface"],
    dependents: 1,
    references: ["color.green.500"],
    updatedAt: "2026-03-18T14:02:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_11",
    name: "color.text.primary",
    type: "color",
    level: "semantic",
    status: "published",
    value: "{color.gray.900}",
    resolvedValue: "#111317",
    tags: ["text"],
    dependents: 8,
    references: ["color.gray.900"],
    updatedAt: "2026-04-22T08:30:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_12",
    name: "color.text.muted",
    type: "color",
    level: "semantic",
    status: "in_review",
    value: "{color.gray.500}",
    resolvedValue: "#6E7079",
    description: "Lower-emphasis text, used in captions and metadata.",
    tags: ["text"],
    dependents: 0,
    references: ["color.gray.500"],
    updatedAt: "2026-05-11T19:00:00Z",
    updatedBy: "Ines Garcia",
  },
  {
    id: "tok_13",
    name: "button.primary.background.default",
    type: "color",
    level: "component",
    status: "published",
    value: "{color.background.brand}",
    resolvedValue: "#005FCC",
    tags: ["button"],
    dependents: 0,
    references: ["color.background.brand"],
    updatedAt: "2026-05-09T10:14:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_14",
    name: "button.primary.background.hover",
    type: "color",
    level: "component",
    status: "draft",
    value: "{color.blue.700}",
    resolvedValue: "#004299",
    description: "Hover state for primary buttons. Pending blue.700 primitive.",
    tags: ["button"],
    dependents: 0,
    references: ["color.blue.700"],
    updatedAt: "2026-05-12T11:05:00Z",
    updatedBy: "Ines Garcia",
  },
  {
    id: "tok_15",
    name: "space.100",
    type: "spacing",
    level: "primitive",
    status: "published",
    value: "4px",
    resolvedValue: "4px",
    tags: ["spacing"],
    dependents: 2,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_16",
    name: "space.200",
    type: "spacing",
    level: "primitive",
    status: "published",
    value: "8px",
    resolvedValue: "8px",
    tags: ["spacing"],
    dependents: 14,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_17",
    name: "space.400",
    type: "spacing",
    level: "primitive",
    status: "published",
    value: "16px",
    resolvedValue: "16px",
    tags: ["spacing"],
    dependents: 22,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_18",
    name: "space.800",
    type: "spacing",
    level: "primitive",
    status: "published",
    value: "32px",
    resolvedValue: "32px",
    tags: ["spacing"],
    dependents: 9,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_19",
    name: "radius.sm",
    type: "radius",
    level: "primitive",
    status: "published",
    value: "4px",
    resolvedValue: "4px",
    tags: ["radius"],
    dependents: 6,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_20",
    name: "radius.md",
    type: "radius",
    level: "primitive",
    status: "published",
    value: "8px",
    resolvedValue: "8px",
    tags: ["radius"],
    dependents: 11,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_21",
    name: "radius.lg",
    type: "radius",
    level: "primitive",
    status: "published",
    value: "12px",
    resolvedValue: "12px",
    tags: ["radius"],
    dependents: 4,
    references: [],
    updatedAt: "2026-02-04T09:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_22",
    name: "font.size.sm",
    type: "typography",
    level: "primitive",
    status: "published",
    value: "13px",
    resolvedValue: "13px",
    tags: ["typography"],
    dependents: 3,
    references: [],
    updatedAt: "2026-01-28T11:30:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_23",
    name: "font.size.md",
    type: "typography",
    level: "primitive",
    status: "published",
    value: "15px",
    resolvedValue: "15px",
    tags: ["typography"],
    dependents: 5,
    references: [],
    updatedAt: "2026-01-28T11:30:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_24",
    name: "font.size.lg",
    type: "typography",
    level: "primitive",
    status: "published",
    value: "19px",
    resolvedValue: "19px",
    tags: ["typography"],
    dependents: 2,
    references: [],
    updatedAt: "2026-01-28T11:30:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_25",
    name: "shadow.sm",
    type: "shadow",
    level: "primitive",
    status: "published",
    value: "0 1px 2px rgba(17,19,23,0.06)",
    resolvedValue: "0 1px 2px rgba(17,19,23,0.06)",
    tags: ["shadow"],
    dependents: 3,
    references: [],
    updatedAt: "2026-01-15T10:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_26",
    name: "shadow.md",
    type: "shadow",
    level: "primitive",
    status: "published",
    value: "0 4px 12px rgba(17,19,23,0.08)",
    resolvedValue: "0 4px 12px rgba(17,19,23,0.08)",
    tags: ["shadow"],
    dependents: 2,
    references: [],
    updatedAt: "2026-01-15T10:00:00Z",
    updatedBy: "Jonas Park",
  },
  {
    id: "tok_27",
    name: "duration.fast",
    type: "duration",
    level: "primitive",
    status: "published",
    value: "150ms",
    resolvedValue: "150ms",
    tags: ["motion"],
    dependents: 4,
    references: [],
    updatedAt: "2026-01-15T10:00:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_28",
    name: "duration.base",
    type: "duration",
    level: "primitive",
    status: "published",
    value: "240ms",
    resolvedValue: "240ms",
    tags: ["motion"],
    dependents: 3,
    references: [],
    updatedAt: "2026-01-15T10:00:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_29",
    name: "easing.standard",
    type: "easing",
    level: "primitive",
    status: "published",
    value: "cubic-bezier(0.2, 0, 0, 1)",
    resolvedValue: "cubic-bezier(0.2, 0, 0, 1)",
    tags: ["motion"],
    dependents: 4,
    references: [],
    updatedAt: "2026-01-15T10:00:00Z",
    updatedBy: "Mara Chen",
  },
  {
    id: "tok_30",
    name: "color.blue.300",
    type: "color",
    level: "primitive",
    status: "deprecated",
    value: "#7DB3F0",
    resolvedValue: "#7DB3F0",
    description: "Replaced by color.blue.400 to improve contrast.",
    tags: ["brand", "blue"],
    dependents: 0,
    references: [],
    updatedAt: "2026-02-20T15:10:00Z",
    updatedBy: "Ines Garcia",
    deprecated: true,
    replacementToken: "color.blue.400",
  },
];

export const changeRequests: ChangeRequest[] = [
  {
    id: "cr_104",
    shortId: "CR-104",
    title: "Introduce muted text token across surfaces",
    description:
      "Adds color.text.muted and migrates inline gray.500 usages in captions and metadata.",
    author: { name: "Ines Garcia" },
    status: "open",
    itemCount: 7,
    breaking: false,
    validation: { errors: 0, warnings: 2 },
    reviewers: [
      { name: "Mara Chen", decision: "pending" },
      { name: "Jonas Park", decision: "approve" },
    ],
    comments: 4,
    updatedAt: "2026-05-13T09:42:00Z",
  },
  {
    id: "cr_103",
    shortId: "CR-103",
    title: "Promote button.primary.hover to a real token",
    description:
      "Replaces hard-coded hover values with a referenced semantic token; depends on color.blue.700.",
    author: { name: "Ines Garcia" },
    status: "changes_requested",
    itemCount: 3,
    breaking: false,
    validation: { errors: 1, warnings: 1 },
    reviewers: [{ name: "Mara Chen", decision: "changes" }],
    comments: 6,
    updatedAt: "2026-05-12T17:11:00Z",
  },
  {
    id: "cr_102",
    shortId: "CR-102",
    title: "Deprecate color.blue.300",
    description:
      "Contrast on disabled-on-light surfaces fails WCAG AA. Replaced by color.blue.400.",
    author: { name: "Mara Chen" },
    status: "approved",
    itemCount: 1,
    breaking: true,
    validation: { errors: 0, warnings: 0 },
    reviewers: [
      { name: "Jonas Park", decision: "approve" },
      { name: "Yuki Tanaka", decision: "approve" },
    ],
    comments: 2,
    updatedAt: "2026-05-10T12:30:00Z",
  },
  {
    id: "cr_101",
    shortId: "CR-101",
    title: "Tighten spacing scale below 8px",
    description:
      "Removes space.50 and renames space.100 to space.025 for clarity.",
    author: { name: "Jonas Park" },
    status: "draft",
    itemCount: 4,
    breaking: true,
    validation: { errors: 0, warnings: 3 },
    reviewers: [],
    comments: 1,
    updatedAt: "2026-05-08T14:00:00Z",
  },
  {
    id: "cr_100",
    shortId: "CR-100",
    title: "Shadow tokens for elevation v2",
    description: "Adds shadow.lg and shadow.xl, refines existing offsets.",
    author: { name: "Mara Chen" },
    status: "published",
    itemCount: 5,
    breaking: false,
    validation: { errors: 0, warnings: 0 },
    reviewers: [{ name: "Jonas Park", decision: "approve" }],
    comments: 3,
    updatedAt: "2026-05-02T10:20:00Z",
  },
];

export const releases: Release[] = [
  {
    id: "rel_2_4_0",
    version: "2.4.0",
    status: "draft",
    tokenCount: 134,
    changeCount: 7,
    breaking: false,
    summary: "Adds muted text token. Refines neutral ramp.",
  },
  {
    id: "rel_2_3_0",
    version: "2.3.0",
    status: "published",
    publishedAt: "2026-05-02T10:20:00Z",
    publishedBy: "Mara Chen",
    tokenCount: 131,
    changeCount: 5,
    breaking: false,
    summary: "Elevation v2 — adds shadow.lg, shadow.xl, refines offsets.",
  },
  {
    id: "rel_2_2_1",
    version: "2.2.1",
    status: "published",
    publishedAt: "2026-04-22T08:30:00Z",
    publishedBy: "Jonas Park",
    tokenCount: 126,
    changeCount: 2,
    breaking: false,
    summary: "Patch: corrects gray.50 value to F7F7F8.",
  },
  {
    id: "rel_2_2_0",
    version: "2.2.0",
    status: "published",
    publishedAt: "2026-03-18T14:02:00Z",
    publishedBy: "Mara Chen",
    tokenCount: 126,
    changeCount: 12,
    breaking: true,
    summary: "New semantic status tokens (success, warning, danger).",
  },
  {
    id: "rel_2_1_0",
    version: "2.1.0",
    status: "published",
    publishedAt: "2026-02-04T09:00:00Z",
    publishedBy: "Jonas Park",
    tokenCount: 114,
    changeCount: 8,
    breaking: false,
    summary: "Spacing scale refinements.",
  },
  {
    id: "rel_2_0_0",
    version: "2.0.0",
    status: "archived",
    publishedAt: "2026-01-15T10:00:00Z",
    publishedBy: "Mara Chen",
    tokenCount: 106,
    changeCount: 41,
    breaking: true,
    summary: "Major: renamed primitives and re-mapped semantics.",
  },
];

export const importJobs: ImportJob[] = [
  {
    id: "imp_07",
    filename: "marketing-tokens.json",
    format: "Style Dictionary",
    status: "ready",
    uploadedBy: "Yuki Tanaka",
    uploadedAt: "2026-05-13T08:00:00Z",
    tokensParsed: 38,
    conflicts: 5,
  },
  {
    id: "imp_06",
    filename: "ios-export.json",
    format: "JSON",
    status: "parsing",
    uploadedBy: "Ines Garcia",
    uploadedAt: "2026-05-13T07:45:00Z",
    tokensParsed: 0,
    conflicts: 0,
  },
  {
    id: "imp_05",
    filename: "figma-variables.json",
    format: "JSON",
    status: "applied",
    uploadedBy: "Mara Chen",
    uploadedAt: "2026-05-09T14:30:00Z",
    tokensParsed: 62,
    conflicts: 2,
  },
];

export const exportJobs: ExportJob[] = [
  {
    id: "exp_22",
    release: "2.3.0",
    format: "CSS",
    status: "ready",
    createdBy: "Jonas Park",
    createdAt: "2026-05-13T09:10:00Z",
    size: "8.2 KB",
  },
  {
    id: "exp_21",
    release: "2.3.0",
    format: "TypeScript",
    status: "ready",
    createdBy: "Jonas Park",
    createdAt: "2026-05-13T09:10:00Z",
    size: "11.4 KB",
  },
  {
    id: "exp_20",
    release: "2.3.0",
    format: "Style Dictionary",
    status: "running",
    createdBy: "Jonas Park",
    createdAt: "2026-05-13T09:09:00Z",
  },
  {
    id: "exp_19",
    release: "2.2.1",
    format: "SCSS",
    status: "ready",
    createdBy: "Mara Chen",
    createdAt: "2026-04-22T08:32:00Z",
    size: "6.9 KB",
  },
];

export const auditEntries: AuditEntry[] = [
  {
    id: "aud_120",
    actor: "Mara Chen",
    action: "release.published",
    entityType: "Release",
    entityId: "2.3.0",
    timestamp: "2026-05-02T10:20:00Z",
  },
  {
    id: "aud_119",
    actor: "Jonas Park",
    action: "change_request.approved",
    entityType: "ChangeRequest",
    entityId: "CR-100",
    timestamp: "2026-05-02T10:14:00Z",
  },
  {
    id: "aud_118",
    actor: "Ines Garcia",
    action: "change_request.submitted",
    entityType: "ChangeRequest",
    entityId: "CR-104",
    timestamp: "2026-05-01T16:02:00Z",
  },
  {
    id: "aud_117",
    actor: "Mara Chen",
    action: "token.deprecated",
    entityType: "Token",
    entityId: "color.blue.300",
    timestamp: "2026-04-30T11:11:00Z",
  },
  {
    id: "aud_116",
    actor: "Yuki Tanaka",
    action: "import.created",
    entityType: "Import",
    entityId: "imp_05",
    timestamp: "2026-04-29T09:00:00Z",
  },
  {
    id: "aud_115",
    actor: "Jonas Park",
    action: "export.created",
    entityType: "Export",
    entityId: "exp_19",
    timestamp: "2026-04-22T08:32:00Z",
  },
  {
    id: "aud_114",
    actor: "Mara Chen",
    action: "schema.updated",
    entityType: "Workspace",
    entityId: "acme/core",
    timestamp: "2026-04-21T13:45:00Z",
  },
];

export function getTokenById(id: string) {
  return tokens.find((t) => t.id === id);
}

export function getChangeRequestById(id: string) {
  return changeRequests.find((c) => c.id === id || c.shortId === id);
}

export function getReleaseById(id: string) {
  return releases.find((r) => r.id === id || r.version === id);
}

export function formatRelativeDate(iso: string, now = new Date()) {
  const date = new Date(iso);
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
