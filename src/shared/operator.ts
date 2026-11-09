import type { OrgRole } from './api'
import type { OperatorUserAccess } from './operator-waitlist'

export function operatorOverviewPath(): string {
  return '/api/operator/overview'
}

export interface OperatorOverview {
  readAt: number
  users: { total: number; lastWeek: number }
  waiting: number
  orgs: { total: number; lastWeek: number }
  workspaces: { total: number; lastWeek: number }
  running: { workspaces: number; builds: number }
  workspaceStates: OperatorWorkspaceStates
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

export interface OperatorWorkspaceStates {
  running: number
  stopped: number
  failed: number
  archived: number
}

export interface OperatorDirectoryQuery {
  q?: string
  cursor?: string
}

function directoryPath(
  kind: 'orgs' | 'users',
  query: OperatorDirectoryQuery,
): string {
  const params = new URLSearchParams()
  if (query.q !== undefined) params.set('q', query.q)
  if (query.cursor !== undefined) params.set('cursor', query.cursor)
  return `/api/operator/${kind}${params.size ? `?${params}` : ''}`
}

export function operatorOrgsPath(query: OperatorDirectoryQuery = {}): string {
  return directoryPath('orgs', query)
}

export function operatorUsersPath(query: OperatorDirectoryQuery = {}): string {
  return directoryPath('users', query)
}

export function operatorOrgPath(orgId: string): string {
  return `/api/operator/orgs/${encodeURIComponent(orgId)}`
}

export function operatorUserPath(githubId: number): string {
  return `/api/operator/users/${githubId}`
}

export type OperatorOrgMatch =
  'org-id' | 'cloud-computer-id' | 'preview-address'

export interface OperatorOrgSummary {
  id: string
  name: string
  initials: string | null
  createdAt: number
  members: number
  workspaces: number
  running: number
  status: 'active' | 'suspended' | 'deleted'
  match: OperatorOrgMatch | null
}

export interface OperatorUserSummary extends OperatorUserAccess {
  githubId: number
  login: string
  name: string | null
  joinedAt: number
  orgs: number
  workspaces: number
  status: 'active' | 'suspended'
}

export interface OperatorOrgsResponse {
  orgs: readonly OperatorOrgSummary[]
  nextCursor: string | null
  total: number
}

export interface OperatorUsersResponse {
  users: readonly OperatorUserSummary[]
  nextCursor: string | null
  total: number
}

export interface OperatorSuspension {
  suspendedAt: number
  operator: { githubId: number; login: string } | null
}

export interface OperatorOrgMember {
  githubId: number
  login: string
  name: string | null
  role: OrgRole
  suspended: boolean
}

export interface OperatorOrgDetail {
  id: string
  name: string
  initials: string | null
  createdAt: number
  repositories: number
  workspaceStates: OperatorWorkspaceStates
  running: { workspaces: number; builds: number }
  members: readonly OperatorOrgMember[]
  suspension: OperatorSuspension | null
  deletion: { deletedAt: number; purgeAt: number | null } | null
}

export interface OperatorUserOrg {
  id: string
  name: string
  initials: string | null
  role: OrgRole
}

export interface OperatorUserDetail extends OperatorUserAccess {
  githubId: number
  login: string
  name: string | null
  joinedAt: number
  workspaces: { total: number; running: number }
  orgs: readonly OperatorUserOrg[]
  suspension: OperatorSuspension | null
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

export interface UserSuspensionLiftResponse {
  userId: string
  liftedAt: number | null
  pendingWorkspaceIds: readonly string[]
}

export interface OrgSuspensionLiftResponse {
  orgId: string
  liftedAt: number | null
  pendingWorkspaceIds: readonly string[]
}
