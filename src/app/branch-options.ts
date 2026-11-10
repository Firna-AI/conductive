import type { WorkspaceBranchOption } from '../shared/workspace-branches'

// The rules of the rows of the branch picker that the draft and the screens
// share.

/**
 * Whether a new workspace can continue the row: a branch, or a pull request
 * whose branch is in the chosen repository. The server compares the ID of
 * the head repository with the ID of the chosen repository, never the
 * branch names, and says so in `availability`.
 */
export function continuable(option: WorkspaceBranchOption): boolean {
  return option.type === 'branch' || option.availability === 'available'
}

/** The branch that a new workspace on the row continues. */
export function branchOf(option: WorkspaceBranchOption): string {
  return option.type === 'branch' ? option.name : option.branch
}

/**
 * The identity of a row in every answer: the name of a branch, or the
 * number of a pull request. A check mark and a focus follow it.
 */
export function optionKey(option: WorkspaceBranchOption): string {
  return option.type === 'branch'
    ? `branch:${option.name}`
    : `pull-request:${option.number}`
}

/** The text of a pull request in a row and in a label, such as "#486 …". */
export function pullRequestText(option: {
  number: number
  title: string
}): string {
  return `#${option.number} ${option.title}`
}
