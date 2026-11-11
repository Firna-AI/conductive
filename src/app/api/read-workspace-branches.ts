import type {
  WorkspaceBranchOption,
  WorkspaceBranchesResponse,
} from '../../shared/workspace-branches'
import {
  choice,
  count,
  items,
  maybeCount,
  maybeText,
  record,
  text,
} from './parse'

/** One row of the picker: a branch, or an open pull request. */
function readBranchOption(value: unknown): WorkspaceBranchOption {
  const row = record(value, 'branch row')
  if (choice(row, 'type', ['branch', 'pull-request']) === 'branch') {
    return { type: 'branch', name: text(row, 'name') }
  }
  return {
    type: 'pull-request',
    number: count(row, 'number'),
    title: text(row, 'title'),
    url: text(row, 'url'),
    branch: text(row, 'branch'),
    headRepositoryId: maybeCount(row, 'headRepositoryId'),
    availability: choice(row, 'availability', [
      'available',
      'another-repository',
    ]),
  }
}

/** One page of the branches and the open pull requests of a repository. */
export function readWorkspaceBranches(
  value: unknown,
): WorkspaceBranchesResponse {
  const body = record(value, 'branches')
  return {
    rows: items(body, 'rows', readBranchOption),
    nextCursor: maybeText(body, 'nextCursor'),
  }
}
