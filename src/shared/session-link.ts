/** This is an app address. Browser API session paths live in sessions.ts. */
export function sessionAddressPath(
  orgId: string,
  workspaceId: string,
  sessionId: string,
): string {
  return `/orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}`
}

export function sessionLink(
  origin: string,
  orgId: string,
  workspaceId: string,
  sessionId: string,
): string {
  return new URL(sessionAddressPath(orgId, workspaceId, sessionId), origin).href
}
