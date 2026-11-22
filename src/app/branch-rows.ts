import type { RepositoryBranchesResponse } from '../shared/branches'
import type { Loadable } from './store'

/** A row of the branch picker. */
export interface BranchRow {
  name: string
  /** The default branch of the repository, which the picker lists first. */
  isDefault: boolean
  /**
   * The time of the newest commit of the branch, or `null` for the default
   * branch and for a branch that GitHub gave no time for.
   */
  committedAt: number | null
  /** The branch of the form, which the row checks. */
  checked: boolean
}

/**
 * What stands under the rows: a line while the list loads or when a search
 * finds nothing, a failed read of GitHub, or a GitHub account that cannot
 * read the repository.
 */
export type BranchStatus =
  | { kind: 'loading' }
  | { kind: 'no-match'; query: string }
  | { kind: 'failed' }
  | { kind: 'no-access' }

export interface BranchRows {
  rows: readonly BranchRow[]
  status: BranchStatus | null
}

/** The code of a read that the GitHub account of the member may not make. */
const noAccess = 'github_access_required'

/**
 * The rows of the picker: the default branch first, then the other
 * branches of the list, newest commit first, as the Worker orders them. A
 * search keeps each branch whose name holds the query, in any case, also
 * the default branch. The default branch needs no read of GitHub, so its
 * row shows in each state of the list.
 */
export function branchRows(
  list: Loadable<RepositoryBranchesResponse>,
  form: { name: string; defaultBranch: string },
  query: string,
): BranchRows {
  const search = query.trim()
  const holds = (name: string) =>
    name.toLowerCase().includes(search.toLowerCase())
  const rows: BranchRow[] = []
  if (holds(form.defaultBranch)) {
    rows.push({
      name: form.defaultBranch,
      isDefault: true,
      committedAt: null,
      checked: form.name === form.defaultBranch,
    })
  }
  if (list.state === 'ready') {
    for (const branch of list.value.branches) {
      if (branch.name === form.defaultBranch || !holds(branch.name)) continue
      rows.push({
        name: branch.name,
        isDefault: false,
        committedAt: branch.committedAt,
        checked: branch.name === form.name,
      })
    }
  }
  return { rows, status: statusOf(list, rows.length, search) }
}

function statusOf(
  list: Loadable<RepositoryBranchesResponse>,
  rows: number,
  search: string,
): BranchStatus | null {
  switch (list.state) {
    case 'loading':
      return { kind: 'loading' }
    case 'failed':
      return list.error.code === noAccess
        ? { kind: 'no-access' }
        : { kind: 'failed' }
    case 'ready':
      return rows === 0 ? { kind: 'no-match', query: search } : null
  }
}
