export function userSuspensionPath(githubId: number): string {
  return `/api/operator/users/${githubId}/suspension`
}

export interface UserSuspensionResponse {
  userId: string
  suspendedAt: number
  pendingWorkspaceIds: readonly string[]
  pendingBuildIds: readonly string[]
}
