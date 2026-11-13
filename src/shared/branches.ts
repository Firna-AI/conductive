import type { Timestamp } from './api'
import { repositoryPath } from './org-settings'

export function repositoryBranchesPath(
  orgId: string,
  repositoryId: string,
): string {
  return `${repositoryPath(orgId, repositoryId)}/branches`
}

export interface RepositoryBranch {
  name: string
  committedAt: Timestamp | null
}

export interface RepositoryBranchesResponse {
  defaultBranch: string
  branches: readonly RepositoryBranch[]
}
