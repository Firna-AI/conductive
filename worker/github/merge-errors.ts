import { HttpError } from '../http'

export const mergeRefused = () =>
  new HttpError(409, 'github_merge_refused', 'GitHub refused the merge.')
export const mergeForbidden = () =>
  new HttpError(
    403,
    'github_merge_forbidden',
    "Not merged: your GitHub access doesn't allow merges into this branch.",
  )
export const mergeHeadChanged = () =>
  new HttpError(
    409,
    'github_head_changed',
    'Not merged: the branch has new commits. Review them, then merge again.',
  )
export const mergeUnavailable = () =>
  new HttpError(
    404,
    'github_merge_unavailable',
    'The merge result is not available. Open the pull request on GitHub.',
  )
