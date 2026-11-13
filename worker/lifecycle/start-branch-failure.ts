import { HttpError } from '../http'
import type { WorkspaceStartJob } from './start-types'

export const START_BRANCH_MISSING_EXIT = 44
export const BASE_BRANCH_MISSING_EXIT = 45

export function missingStartBranchFailure(
  job: WorkspaceStartJob,
  exitCode: number | null,
): HttpError | null {
  const branch =
    exitCode === START_BRANCH_MISSING_EXIT
      ? (job.startBranch ?? job.baseBranch ?? job.defaultBranch)
      : exitCode === BASE_BRANCH_MISSING_EXIT
        ? (job.baseBranch ?? job.defaultBranch)
        : null
  return branch === null
    ? null
    : new HttpError(
        502,
        'workspace_start_failed',
        `The branch \`${branch}\` is no longer on GitHub.`,
      )
}
