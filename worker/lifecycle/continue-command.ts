import { HttpError } from '../http'
import type { CommandStatus, MachineChannel } from '../machines/channel'
import { isTransientHostError } from '../machines/errors'
import { providerForAccount } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { lifecycleCommand } from './command-intents'
import {
  continueBranchCommand,
  continueFetchCommand,
  continueMoveCommand,
} from './continue-commands'
import { authorizeContinue } from './continue-data'
import { continueFailed } from './continue-failure'
import type { ContinueProgress } from './continue-progress'
import type { ContinueJob, ContinueOptions } from './continue-types'
import { workspaceAutoStopSeconds } from './idle-stop'
import {
  CONTINUE_EXIT_CODES,
  continueCommandStopCause,
} from './continue-stop-causes'
import {
  settlementCommandChannel,
  workspaceCommandChannel,
} from './workspace-command-channel'

// Two minutes covers the host's 60-second idle limit and a reconnect, well
// before the sandbox auto-stop of at least 16 minutes.
const HOST_STATUS_WAIT_MS = 120_000

async function completeCommand(progress: ContinueProgress, job: ContinueJob) {
  progress.scope = null
  if (job.phase === 'fetch' && (job.cancelled || job.failure)) {
    await failCommand(progress, job)
    return
  }
  job.stopCause = 'unknown'
  job.phase = job.phase === 'fetch' ? 'move' : 'publish'
  job.processId = null
  delete job.commandRoute
  delete job.hostStatusFailingSince
  job.commandStarted = false
  job.stdoutOffset = 0
  job.stderrOffset = 0
  await progress.save(job)
}

export async function advanceContinueCommand(
  options: ContinueOptions,
  progress: ContinueProgress,
  job: ContinueJob,
) {
  let authorized = true
  if (job.commandStarted) {
    try {
      await options.run(() => authorizeContinue(options, job))
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
  }
  const provider = continueProvider(options, job)
  const channel = authorized
    ? workspaceCommandChannel(options.env, job, provider)
    : await settlementCommandChannel(options.env, job, provider)
  if (!channel) return failCommand(progress, job)
  if (await step(provider, channel, options, progress, job))
    await completeCommand(progress, job)
}

function failCommand(progress: ContinueProgress, job: ContinueJob) {
  const error = job.failure ?? continueFailed(job)
  return progress.finish(job, {
    ok: false,
    error: { status: error.status, code: error.code, message: error.message },
  })
}

function continueProvider(
  options: ContinueOptions,
  job: ContinueJob,
): SandboxProvider {
  try {
    return providerForAccount(
      options.env,
      options.dependencies.fetch,
      job.providerAccount,
    )
  } catch (error) {
    job.stopCause = 'provider-preparation-failed'
    throw error
  }
}

async function step(
  provider: SandboxProvider,
  channel: MachineChannel,
  options: ContinueOptions,
  progress: ContinueProgress,
  job: ContinueJob,
): Promise<boolean> {
  if (job.phase !== 'fetch' && job.phase !== 'move') return false
  if (job.processId === null) {
    const recoverOnly = job.commandStarted
    if (!recoverOnly) {
      await options.run(() => authorizeContinue(options, job))
      try {
        await provider.setAutoStop(
          job.sandboxId,
          await workspaceAutoStopSeconds(options.env.DB),
        )
      } catch (error) {
        job.stopCause = 'provider-preparation-failed'
        throw error
      }
      await options.run(() => authorizeContinue(options, job))
      job.commandStarted = true
      await progress.save(job)
    }
    const command =
      job.phase === 'fetch'
        ? continueFetchCommand(job)
        : continueMoveCommand(job)
    try {
      if (!recoverOnly && job.phase === 'fetch') progress.scope = job.fetchId
      const started = await channel.startCommand(
        lifecycleCommand(
          {
            kind: 'workspace',
            id: job.binding.id,
            attempt: `continue-${job.id}`,
          },
          job.phase === 'fetch' ? 'fetch' : 'branch',
          command,
          recoverOnly,
        ),
      )
      job.processId = started.processId
      job.commandRoute = started.route
      if (!job.cancelled) job.stopCause = 'unknown'
      await progress.save(job)
    } catch {
      progress.scope = null
      if (!job.cancelled) job.stopCause = 'command-start-uncertain'
      await progress.save(job)
    }
    return false
  }
  let status: CommandStatus
  try {
    status = await channel.getCommandStatus(
      { processId: job.processId, route: job.commandRoute ?? 'provider' },
      { stdoutOffset: job.stdoutOffset, stderrOffset: job.stderrOffset },
    )
  } catch (error) {
    if (job.commandRoute !== 'host' || !isTransientHostError(error)) throw error
    progress.scope = null
    const now = options.dependencies.now()
    if (job.hostStatusFailingSince === undefined) {
      job.hostStatusFailingSince = now
      await progress.save(job)
    }
    if (now - job.hostStatusFailingSince < HOST_STATUS_WAIT_MS) throw error
    return recoverLostCommand(channel, progress, job)
  }
  delete job.hostStatusFailingSince
  if (status.state !== 'running') progress.scope = null
  job.stdoutOffset = status.stdoutNextOffset
  job.stderrOffset = status.stderrNextOffset
  if (!status.more && !status.running && !job.cancelled && !job.failure)
    job.stopCause = continueCommandStopCause(job.phase, status)
  await progress.save(job)
  if (status.more || status.running) return false
  if (status.state === 'lost') return recoverLostCommand(channel, progress, job)
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut) {
    if (job.phase === 'move' && (await switchedBranch(channel, progress, job)))
      return true
    await failCommand(progress, job)
    return false
  }
  return true
}

async function recoverLostCommand(
  channel: MachineChannel,
  progress: ContinueProgress,
  job: ContinueJob,
): Promise<boolean> {
  if (job.phase === 'move' && (await switchedBranch(channel, progress, job)))
    return true
  job.processId = null
  delete job.commandRoute
  delete job.hostStatusFailingSince
  await progress.save(job)
  return false
}

async function switchedBranch(
  channel: MachineChannel,
  progress: ContinueProgress,
  job: ContinueJob,
): Promise<boolean> {
  const result = await channel.runCommand(continueBranchCommand(job))
  if (
    result.exitCode === CONTINUE_EXIT_CODES.comparisonMetadata &&
    !result.timedOut
  ) {
    job.stopCause = 'comparison-metadata-failed'
    await progress.save(job)
  }
  if (result.exitCode === 0 && !result.timedOut) {
    if (result.stdout === `${job.branch}\n`) return true
    if (result.stdout === `${job.binding.branch}\n`) return false
  }
  throw new Error('The branch change still needs reconciliation.')
}
