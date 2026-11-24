import type { RepositoryChangeWork } from '../../src/shared/workspaces'
import { providerForAccount } from '../sandbox/client'
import {
  localWorkCommand,
  localWorkResult,
  localWorkUnavailable,
} from './local-work'
import { carriedWorkCommand } from './repository-change-commands'
import { authorizeRepositoryChange } from './repository-change-data'
import type {
  RepositoryChangeJob,
  RepositoryChangeOptions,
} from './repository-change-types'
import { workspaceCommandChannel } from './workspace-command-channel'

/**
 * The work of the question: the local work of the old folder, as Continue
 * counts it, the GitHub facts of the old branch, and the changed files of
 * the new folder, which move to the new branch.
 */
export async function readRepositoryChangeWork(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
): Promise<RepositoryChangeWork> {
  const provider = providerForAccount(
    options.env,
    options.dependencies.fetch,
    job.providerAccount,
  )
  const channel = workspaceCommandChannel(options.env, job, provider)
  const read = async (command: string) => {
    const result = await channel.runCommand(command)
    if (result.exitCode !== 0 || result.timedOut) throw localWorkUnavailable()
    return localWorkResult(result.stdout)
  }
  const localWork = await read(localWorkCommand(job.directory))
  await options.run(() => authorizeRepositoryChange(options, job))
  const carried = await read(carriedWorkCommand(job.target.directory))
  return {
    localWork,
    pullRequest: job.oldBranch?.pullRequest ?? null,
    pushedCommits: job.oldBranch?.pushedCommits ?? 0,
    carriedFiles: carried.uncommittedFiles,
  }
}

export function hasRepositoryChangeWork(work: RepositoryChangeWork): boolean {
  return (
    work.localWork.uncommittedFiles.length > 0 ||
    work.localWork.unpushedCommits > 0 ||
    work.pullRequest !== null ||
    work.pushedCommits > 0 ||
    work.carriedFiles.length > 0
  )
}
