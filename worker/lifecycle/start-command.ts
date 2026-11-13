import type { CommitAuthor } from '../../src/shared/commit-author'
import { shellQuote } from './commands'
import { defaultBranchCommand } from './default-branch-command'
import { repositoryLocation } from './repository-locations'
import { workspaceStartupCommand } from './image-software'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceStartJob } from './start-types'
import { workspaceBaseCommand } from './workspace-base-command'

/** Startup and repository commands share the same detached output journal. */
export function workspacePhaseCommand(
  row: Pick<WorkspaceRow, 'repositoryId' | 'branch' | 'baseBranch'>,
  job: WorkspaceStartJob,
  owner: CommitAuthor | null,
): string {
  const directory = repositoryLocation(
    job.repositoryLocations,
    row.repositoryId,
  )
  if (job.phase === 'startup')
    return [
      'set -eu',
      `${workspaceBaseCommand({
        directory,
        branch: row.branch,
        baseBranch: row.baseBranch ?? job.baseBranch ?? job.defaultBranch,
      })} || :`,
      workspaceStartupCommand(job.startupScript, owner),
    ].join('\n')
  const startBranch = job.startBranch ?? job.baseBranch ?? job.defaultBranch
  if (job.phase === 'fetch') {
    if (!job.creation) throw new Error('Missing trusted creation sender')
    return defaultBranchCommand({
      directory,
      defaultBranch: job.defaultBranch,
      startBranch,
      baseBranch: job.baseBranch ?? job.defaultBranch,
      turnId: job.turnId,
      sender: job.creation.sender,
    })
  }
  const start = job.startSha
    ? `conductive_start=$(git rev-parse --verify --end-of-options ${shellQuote(`${job.startSha}^{commit}`)} 2>/dev/null) || conductive_start=${shellQuote(`refs/remotes/origin/${startBranch}`)}`
    : `conductive_start=${shellQuote(`refs/remotes/origin/${startBranch}`)}`
  return `set -eu
export CONDUCTIVE_TURN_ID=${shellQuote(job.turnId)}
cd ${shellQuote(directory)}
${start}
if git show-ref --verify --quiet ${shellQuote(`refs/heads/${row.branch}`)}; then
  git checkout ${shellQuote(row.branch)}
else
  git checkout -b ${shellQuote(row.branch)} "$conductive_start"
fi
git config ${shellQuote(`branch.${row.branch}.gh-merge-base`)} ${shellQuote(job.baseBranch ?? job.defaultBranch)}`
}
