import { NextResponse } from "next/server";

/**
 * Tiny discovery endpoint. Useful for sanity-checking that the API mount
 * exists and listing the available endpoint families.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: "tokene-api",
    version: "v1",
    docs:
      "https://github.com/blakinq/tokene — see tokene.md §34 for the endpoint map.",
    endpoints: [
      "GET    /api/v1/workspaces/:workspaceId/tokens",
      "POST   /api/v1/workspaces/:workspaceId/tokens",
      "POST   /api/v1/workspaces/:workspaceId/tokens/validate",
      "GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId",
      "GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId/history",
      "GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId/references",
      "GET    /api/v1/workspaces/:workspaceId/tokens/:tokenId/dependents",
      "GET    /api/v1/workspaces/:workspaceId/change-requests",
      "POST   /api/v1/workspaces/:workspaceId/change-requests",
      "GET    /api/v1/workspaces/:workspaceId/change-requests/:id",
      "GET    /api/v1/workspaces/:workspaceId/releases",
      "GET    /api/v1/workspaces/:workspaceId/releases/latest",
      "GET    /api/v1/workspaces/:workspaceId/releases/:releaseId",
      "GET    /api/v1/workspaces/:workspaceId/releases/:releaseId/changelog",
      "GET    /api/v1/workspaces/:workspaceId/imports",
      "GET    /api/v1/workspaces/:workspaceId/audit-logs",
      "GET    /api/v1/workspaces/:workspaceId/settings",
      "PATCH  /api/v1/workspaces/:workspaceId/settings",
      "GET    /api/v1/workspaces/:workspaceId/members",
      "GET    /api/v1/workspaces/:workspaceId/api-keys",
      "GET    /api/exports/:releaseId/{css,scss,ts,json,style-dictionary}",
    ],
  });
}
