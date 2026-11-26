import { HttpError } from '../http'

export const queueMissing = () =>
  new HttpError(
    404,
    'merge_queue_entry_not_found',
    'This workspace is unavailable in the merge queue.',
  )

export const queueWriteRequired = () =>
  new HttpError(
    403,
    'merge_queue_write_required',
    'You need write access on GitHub to change the merge queue.',
  )

export const queueRepositoryBusy = () =>
  new HttpError(
    409,
    'merge_queue_repository_in_use',
    'Another organization already queues this repository.',
  )

export const queuePullMissing = () =>
  new HttpError(
    409,
    'merge_queue_pull_required',
    'Open a pull request before adding this workspace.',
  )

export const queueFork = () =>
  new HttpError(
    409,
    'merge_queue_fork',
    'Use a pull request from this repository to join the merge queue.',
  )

export const queueWrongBase = () =>
  new HttpError(
    409,
    'merge_queue_wrong_base',
    'The bottom pull request must target the default branch.',
  )

export const queueRequiresGitHub = () =>
  new HttpError(
    409,
    'merge_queue_github_required',
    "The default branch requires GitHub's merge queue.",
  )

export const queueStackWorkspaceMissing = () =>
  new HttpError(
    409,
    'merge_queue_stack_workspace_missing',
    'A lower pull request needs an active workspace.',
  )

export const queueUnitConflict = () =>
  new HttpError(
    409,
    'merge_queue_unit_conflict',
    'Another pull request already builds on this place in the stack.',
  )

export const queueMerging = () =>
  new HttpError(
    409,
    'merge_queue_merging',
    'Wait for the merge to finish, then try again.',
  )

export const queueChanged = () =>
  new HttpError(
    409,
    'merge_queue_changed',
    'The merge queue or pull request changed. Try again.',
  )

export const queueMergeNotReady = () =>
  new HttpError(
    409,
    'merge_queue_not_ready',
    'This pull request and the ones ahead must be ready in the GitHub stack.',
  )

export const queueMergeRequired = () =>
  new HttpError(
    409,
    'merge_queue_required',
    'The merge queue holds a pull request in this merge.',
  )
