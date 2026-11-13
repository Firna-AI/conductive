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
 * The branches of a repository, from `RepositoryBranchesResponse`: the
 * default branch first, then the others by their newest commit. A branch
 * without a commit date, such as the default branch of an empty repository,
 * has none.
 */
export function readRepositoryBranches(
  value: unknown,
): RepositoryBranchesResponse {
  const list = record(value, 'branches')
  return {
    defaultBranch: text(list, 'defaultBranch'),
    branches: items(list, 'branches', readBranch),
  }
}
