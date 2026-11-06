import { repositoryDirectory, shellQuote } from './commands'
import { workspaceStartupCommand } from './image-software'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceStartJob } from './start-types'

/** Startup and repository commands share the same detached output journal. */
export function workspacePhaseCommand(
  row: WorkspaceRow,
  job: WorkspaceStartJob,
): string {
  if (job.phase === 'startup') return workspaceStartupCommand(job.startupScript)
  const git =
    job.phase === 'fetch'
      ? `git fetch origin ${shellQuote(job.defaultBranch)}`
      : `git checkout -b ${shellQuote(row.branch)} FETCH_HEAD`
  return `set -eu\nexport CONDUCTING_TURN_ID=${shellQuote(job.turnId)}\ncd ${shellQuote(repositoryDirectory(row.repositoryId))}\n${git}`
}
