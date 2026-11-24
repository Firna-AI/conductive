import { HttpError } from '../http'
import type { MachineChannel } from '../machines/channel'
import { providerForAccount } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { lifecycleCommand } from './command-intents'
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
import { workspaceAutoStopSeconds } from './idle-stop'
import {
  settlementCommandChannel,
  workspaceCommandChannel,
} from './workspace-command-channel'

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
  let authorized = true
  if (job.commandStarted) {
    try {
      await options.run(() => authorizeRepositoryChange(options, job))
    } catch (error) {
      authorized = false
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
  const channel = authorized
    ? workspaceCommandChannel(options.env, job, provider)
    : await settlementCommandChannel(options.env, job, provider)
  if (!channel) return failCommand(progress, job)
  if (await step(provider, channel, options, progress, job))
    await completeCommand(progress, job)
}

async function completeCommand(
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
) {
  progress.scope = null
  if (job.phase === 'fetch' && (job.cancelled || job.failure)) {
    await failCommand(progress, job)
    return
  }
  job.phase = job.phase === 'fetch' ? 'move' : 'publish'
  // The publication gets its own time limit, after a branch read that failed.
  delete job.failingSince
  job.processId = null
  delete job.commandRoute
  job.commandStarted = false
  job.stdoutOffset = 0
  job.stderrOffset = 0
  await progress.save(job)
}

function failCommand(
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
  exitCode: number | null = null,
) {
  const error = job.failure ?? repositoryChangeFailed(job, exitCode)
  return progress.finish(job, {
    ok: false,
    error: { status: error.status, code: error.code, message: error.message },
  })
}

async function step(
  provider: SandboxProvider,
  channel: MachineChannel,
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
): Promise<boolean> {
  if (job.processId === null) {
    const recoverOnly = job.commandStarted
    if (!recoverOnly) {
      await options.run(() => authorizeRepositoryChange(options, job))
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
        : repositoryChangeMoveCommand(job)
    try {
      if (!recoverOnly && job.phase === 'fetch') progress.scope = job.fetchId
      const started = await channel.startCommand(
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
      job.commandRoute = started.route
      await progress.save(job)
    } catch {
      progress.scope = null
    }
    return false
  }
  const status = await channel.getCommandStatus(
    { processId: job.processId, route: job.commandRoute ?? 'provider' },
    { stdoutOffset: job.stdoutOffset, stderrOffset: job.stderrOffset },
  )
  if (status.state !== 'running') progress.scope = null
  job.stdoutOffset = status.stdoutNextOffset
  job.stderrOffset = status.stderrNextOffset
  await progress.save(job)
  if (status.more || status.running) return false
  if (status.state === 'lost') {
    if (job.phase === 'move' && (await switchedBranch(channel, job)))
      return true
    job.processId = null
    delete job.commandRoute
    await progress.save(job)
    return false
  }
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut) {
    if (job.phase === 'move' && (await switchedBranch(channel, job)))
      return true
    await failCommand(
      progress,
      job,
      status.state === 'exited' && !status.timedOut ? status.exitCode : null,
    )
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
  channel: MachineChannel,
  job: RepositoryChangeJob,
): Promise<boolean> {
  const result = await channel.runCommand(repositoryChangeBranchCommand(job))
  if (result.exitCode === 0 && !result.timedOut)
    return result.stdout === `${job.branch}\n`
  throw new BranchReadFailed()
}
