import { shellQuote } from './commands'
import { defaultBranchCommand } from './default-branch-command'
import {
  existingBranchCheckout,
  existingBranchFetch,
} from './existing-branch-command'
import { repositoryLocation } from './repository-locations'
import {
  workspaceStartupCommand,
  workspaceStartupBody,
  workspaceRunnerLaunch,
  installImageSoftware,
} from './image-software'
import { privilegedCommand } from '../terminal/privileged'
import { workspaceToolsCommand } from '../tools/image'
import { WORKSPACE_TOOL_SOURCES } from '../tools/image-assets'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceStartJob } from './start-types'

/** Startup and repository commands share the same detached output journal. */
export function workspacePhaseCommand(
  row: WorkspaceRow,
  job: WorkspaceStartJob,
): string {
  if (job.kind === 'activate') {
    if (job.phase === 'import-software')
      return `${privilegedCommand(workspaceToolsCommand(WORKSPACE_TOOL_SOURCES))}\n${installImageSoftware(job.activation.software)}`
    if (job.phase === 'import-launch') return workspaceRunnerLaunch(job.attempt)
    if (job.phase === 'startup') return workspaceStartupBody(job.startupScript)
    throw new Error('Invalid import shell phase.')
  }
  if (job.phase === 'startup') return workspaceStartupCommand(job.startupScript)
  if (job.turnId === null) throw new Error('Missing native creation turn.')
  const directory = repositoryLocation(
    job.repositoryLocations,
    row.repositoryId,
  )
  if (job.creation?.branchMode === 'existing') {
    if (job.phase === 'fetch')
      return existingBranchFetch(directory, row.branch, job.turnId)
    return existingBranchCheckout(directory, row.branch, job.turnId)
  }
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
