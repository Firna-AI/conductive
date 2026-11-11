import { repositoryPath } from './org-settings'

export type WorkspaceBranchChoice =
  { type: 'new' } | { type: 'existing'; name: string }

export type WorkspaceBranchOption =
  | { type: 'branch'; name: string }
  | {
      type: 'pull-request'
      number: number
      title: string
      url: string
      branch: string
      headRepositoryId: number | null
      availability: 'available' | 'another-repository'
    }

export interface WorkspaceBranchesResponse {
  rows: readonly WorkspaceBranchOption[]
  /** Follow this cursor even when filtering leaves the current page empty. */
  nextCursor: string | null
}

export function repositoryBranchesPath(
  orgId: string,
  repositoryId: string,
): string {
  return `${repositoryPath(orgId, repositoryId)}/branches`
}
