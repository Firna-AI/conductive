export function userSuspensionPath(githubId: number): string {
  return `/api/operator/users/${githubId}/suspension`
}

export function orgSuspensionPath(orgId: string): string {
  return `/api/operator/orgs/${encodeURIComponent(orgId)}/suspension`
}

export interface OrgSuspensionResponse {
  orgId: string
  suspendedAt: number
  pendingWorkspaceIds: readonly string[]
  pendingBuildIds: readonly string[]
}

export interface UserSuspensionResponse {
  userId: string
  suspendedAt: number
  pendingWorkspaceIds: readonly string[]
  pendingBuildIds: readonly string[]
}
