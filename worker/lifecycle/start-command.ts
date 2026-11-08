import { shellQuote } from './commands'
import { defaultBranchCommand } from './default-branch-command'
import { repositoryLocation } from './repository-locations'
import { workspaceStartupCommand } from './image-software'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceStartJob } from './start-types'

/** Startup and repository commands share the same detached output journal. */
export function workspacePhaseCommand(
  row: WorkspaceRow,
  job: WorkspaceStartJob,
): string {
  if (job.phase === 'startup') return workspaceStartupCommand(job.startupScript)
  const directory = repositoryLocation(
    job.repositoryLocations,
    row.repositoryId,
  )
  if (job.phase === 'fetch') {
    if (!job.creation) throw new Error('Missing trusted creation sender')
    return defaultBranchCommand({
      directory,
      defaultBranch: job.defaultBranch,
      turnId: job.turnId,
      sender: job.creation.sender,
    })
  }
  return `set -eu
export CONDUCTIVE_TURN_ID=${shellQuote(job.turnId)}
cd ${shellQuote(directory)}
if git show-ref --verify --quiet ${shellQuote(`refs/heads/${row.branch}`)}; then
  git checkout ${shellQuote(row.branch)}
else
  git checkout -b ${shellQuote(row.branch)} FETCH_HEAD
fi`
}
