export function operatorOverviewPath(): string {
  return '/api/operator/overview'
}

export interface OperatorOverview {
  readAt: number
  users: { total: number; lastWeek: number }
  orgs: { total: number; lastWeek: number }
  workspaces: { total: number; lastWeek: number }
  running: { workspaces: number; builds: number }
  workspaceStates: {
    running: number
    stopped: number
    failed: number
    archived: number
  }
  newWorkspacesByDay: readonly { date: string; count: number }[]
  newUsersByDay: readonly { date: string; count: number }[]
  largestOrgs: readonly {
    id: string
    name: string
    initials: string | null
    members: number
    workspaces: number
    running: number
  }[]
}

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
