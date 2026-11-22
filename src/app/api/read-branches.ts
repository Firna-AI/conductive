import type {
  RepositoryBranch,
  RepositoryBranchesResponse,
} from '../../shared/branches'
import { items, maybeCount, record, text } from './parse'

function readBranch(value: unknown): RepositoryBranch {
  const branch = record(value, 'branch')
  return {
    name: text(branch, 'name'),
    committedAt: maybeCount(branch, 'committedAt'),
  }
}

/**
 * The branches that GitHub lists, newest commit first. A branch without a
 * commit date has none. The picker adds its default row from the saved
 * repository record.
 */
export function readRepositoryBranches(
  value: unknown,
): RepositoryBranchesResponse {
  const list = record(value, 'branches')
  return {
    branches: items(list, 'branches', readBranch),
  }
}
