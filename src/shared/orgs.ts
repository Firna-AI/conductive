import { orgPath, type Org, type Timestamp } from './api'

export interface OrgSummary extends Org {
  /** Custom initials shown in the rail. Older replies may omit them. */
  initials?: string
  /** Absent for an active org. Only its admins can see a deleted org. */
  deletion?: { deletedAt: Timestamp; deletesAt: Timestamp }
}

export interface OrgsResponse {
  orgs: readonly OrgSummary[]
}
export interface OrgResponse {
  org: OrgSummary
}
export interface CreateOrgRequest {
  name: string
  initials?: string
  /** GitHub repository IDs from the account list, not app Repository.id values. */
  repositoryIds?: readonly number[]
}
export type CreateOrgResponse = OrgResponse
export interface RenameOrgRequest {
  name: string
  initials?: string
}
export type RenameOrgResponse = OrgResponse
export interface DeleteOrgRequest {
  name: string
}
export type DeleteOrgResponse = OrgResponse
export type RestoreOrgResponse = OrgResponse

export function deleteOrgPath(orgId: string): string {
  return `${orgPath(orgId)}/delete`
}
export function restoreOrgPath(orgId: string): string {
  return `${orgPath(orgId)}/restore`
}
export function leaveOrgPath(orgId: string): string {
  return `${orgPath(orgId)}/leave`
}
