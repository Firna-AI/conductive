import { orgPath, type OrgRole, type Timestamp, type User } from './api'
import { workspacePath, type Workspace } from './workspaces'

export function membersPath(orgId: string): string {
  return `${orgPath(orgId)}/members`
}
export function memberPath(orgId: string, userId: string): string {
  return `${membersPath(orgId)}/${encodeURIComponent(userId)}`
}
export function invitesPath(orgId: string): string {
  return `${orgPath(orgId)}/invites`
}
export function invitePath(orgId: string, inviteId: string): string {
  return `${invitesPath(orgId)}/${encodeURIComponent(inviteId)}`
}
export function workspaceOwnerPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/owner`
}
export interface OrgMember {
  user: User
  role: OrgRole
  joinedAt: Timestamp
}
export interface OrgInvite {
  id: string
  githubLogin: string
  createdAt: Timestamp
}
export interface MembersResponse {
  members: readonly OrgMember[]
  invites: readonly OrgInvite[]
}
export interface InviteMemberRequest {
  githubLogin: string
}
export interface InviteMemberResponse {
  invite: OrgInvite
}
export interface ChangeMemberRoleRequest {
  role: OrgRole
}
export interface MemberResponse {
  member: OrgMember
}
export interface ReassignWorkspaceRequest {
  userId: string
}
export interface ReassignWorkspaceResponse {
  workspace: Workspace
}
