import { HttpError } from '../http'
import { providerForAccount } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { lifecycleCommand } from './command-intents'
import { continueStagingDirectory } from './continue-commands'
import { workspaceAutoStopSeconds } from './idle-stop'
import { isolatedSourceCommand } from './image-sources/native-command'
import {
  repositoryChangeBranchCommand,
  repositoryChangeFetchCommand,
  repositoryChangeMoveCommand,
} from './repository-change-commands'
import { authorizeRepositoryChange } from './repository-change-data'
import {
  BranchReadFailed,
  repositoryChangeFailed,
} from './repository-change-errors'
import type { RepositoryChangeProgress } from './repository-change-progress'
import type {
  RepositoryChangeJob,
  RepositoryChangeOptions,
} from './repository-change-types'
import {
  recordClonedRepositoryLocation,
  workspaceRepositoryLocations,
} from './repository-location-data'
import { removeCloneStage } from './repository-clone-stage'

/** Reclaim space after a failed clone. The next clone sweeps an unreachable stage. */
export async function discardFailedCloneStage(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
): Promise<void> {
  if (
    !job.target.clone ||
    !(job.commandStarted || job.phase === 'move' || job.phase === 'publish')
  )
    return
  try {
    await providerForAccount(
      options.env,
      options.dependencies.fetch,
      job.providerAccount,
    ).runCommand(
      job.sandboxId,
      isolatedSourceCommand(removeCloneStage(continueStagingDirectory(job.id))),
    )
  } catch {
    // An unavailable computer may still hold the stage when it resumes.
  }
}

/**
 * The fetch and the move run detached, as in Continue. Once a command
 * started, each later step settles it first. A failed access check then
 * closes the fetch scope and keeps the error, but the result is still read.
 */
export async function advanceRepositoryChangeCommand(
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
): Promise<void> {
  if (job.commandStarted) {
    try {
      await options.run(() => authorizeRepositoryChange(options, job))
    } catch (error) {
      progress.scope = null
      if (error instanceof HttpError)
        job.failure = {
          status: error.status,
          code: error.code,
          message: error.message,
        }
      await progress.save(job)
    }
    if (job.cancelled) progress.scope = null
  } else if (job.cancelled) throw repositoryChangeFailed(job)
  const provider = providerForAccount(
    options.env,
    options.dependencies.fetch,
    job.providerAccount,
  )
  if (await step(provider, options, progress, job))
    await completeCommand(options, progress, job)
}

async function completeCommand(
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
) {
  progress.scope = null
  const clone = job.phase === 'move' ? job.target.clone : undefined
  const sandboxChanged =
    clone &&
    !(await recordClonedRepositoryLocation(
      options.env.DB,
      {
        id: job.binding.id,
        sandboxId: job.sandboxId,
        providerAccount: job.providerAccount,
      },
      {
        repositoryId: job.target.repositoryId,
        directory: job.target.directory,
        variable: clone.variable,
      },
    ))
  if (
    sandboxChanged ||
    (job.phase === 'fetch' && (job.cancelled || job.failure))
  ) {
    const error = job.failure ?? repositoryChangeFailed(job)
    await progress.finish(job, {
      ok: false,
      error: { status: error.status, code: error.code, message: error.message },
    })
    return
  }
  job.phase = job.phase === 'fetch' ? 'move' : 'publish'
  // The publication gets its own time limit, after a branch read that failed.
  delete job.failingSince
  job.processId = null
  job.commandStarted = false
  job.stdoutOffset = 0
  job.stderrOffset = 0
  await progress.save(job)
}

async function step(
  provider: SandboxProvider,
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
): Promise<boolean> {
  if (job.processId === null) {
    const recoverOnly = job.commandStarted
    let recordedFolders: readonly string[] = []
    if (!recoverOnly) {
      await options.run(() => authorizeRepositoryChange(options, job))
      if (job.phase === 'move' && job.target.clone)
        recordedFolders = (
          await workspaceRepositoryLocations(options.env.DB, job.binding.id)
        ).map(({ directory }) => directory)
      await provider.setAutoStop(
        job.sandboxId,
        await workspaceAutoStopSeconds(options.env.DB),
      )
      await options.run(() => authorizeRepositoryChange(options, job))
      job.commandStarted = true
      await progress.save(job)
    }
    const command =
      job.phase === 'fetch'
        ? repositoryChangeFetchCommand(job)
        : repositoryChangeMoveCommand(job, recordedFolders)
    try {
      if (!recoverOnly && job.phase === 'fetch') progress.scope = job.fetchId
      const started = await provider.startCommand(
        job.sandboxId,
        lifecycleCommand(
          {
            kind: 'workspace',
            id: job.binding.id,
            attempt: `repository-change-${job.id}`,
          },
          job.phase === 'fetch' ? 'fetch' : 'branch',
          command,
          recoverOnly,
        ),
      )
      job.processId = started.processId
      await progress.save(job)
    } catch {
      progress.scope = null
    }
    return false
  }
  const status = await provider.getCommandStatus(job.sandboxId, job.processId, {
    stdoutOffset: job.stdoutOffset,
    stderrOffset: job.stderrOffset,
  })
  if (status.state !== 'running') progress.scope = null
  job.stdoutOffset = status.stdoutNextOffset
  job.stderrOffset = status.stderrNextOffset
  await progress.save(job)
  if (status.more || status.running) return false
  if (status.state === 'lost') {
    if (job.phase === 'move' && (await switchedBranch(provider, job)))
      return true
    job.processId = null
    await progress.save(job)
    return false
  }
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut) {
    if (job.phase === 'move' && (await switchedBranch(provider, job)))
      return true
    const error =
      job.failure ??
      repositoryChangeFailed(
        job,
        status.state === 'exited' && !status.timedOut ? status.exitCode : null,
      )
    await progress.finish(job, {
      ok: false,
      error: { status: error.status, code: error.code, message: error.message },
    })
    return false
  }
  return true
}

/**
 * The new branch makes the move done, so publication runs with no second
 * checkout. Another branch, also no branch, keeps the old repository. A
 * failed read keeps the reservation, and the step retries until the end
 * rule of `endAfterMove` ends the job.
 */
async function switchedBranch(
  provider: SandboxProvider,
  job: RepositoryChangeJob,
): Promise<boolean> {
  const result = await provider.runCommand(
    job.sandboxId,
    repositoryChangeBranchCommand(job),
  )
  if (result.exitCode === 0 && !result.timedOut)
    return result.stdout === `${job.branch}\n`
  throw new BranchReadFailed()
}
