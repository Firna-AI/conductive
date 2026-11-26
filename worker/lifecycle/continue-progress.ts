import { readContinueWork } from './continue-work'
import { HttpError } from '../http'
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
import type { ContinueJob, ContinueOptions } from './continue-types'
import { publishContinue } from './continue-publication'
import { continueBase } from './continue-base'
import { workspaceAutoStopSeconds } from './idle-stop'
import {
  CONTINUE_EXIT_CODES,
  continueCommandStopCause,
} from './continue-stop-causes'

export interface ContinueProgress {
  scope: string | null
  save(job: ContinueJob): Promise<void>
  finish(
    job: ContinueJob,
    result: NonNullable<ContinueJob['outcome']>,
  ): Promise<void>
}

export async function advanceContinue(
  options: ContinueOptions,
  progress: ContinueProgress,
  job: ContinueJob,
): Promise<void> {
  if (job.phase === 'publish') {
    progress.scope = null
    await publishContinue(options, job)
    return
  }
  if (job.commandStarted && (job.phase === 'fetch' || job.phase === 'move')) {
    await settleContinueCommand(options, progress, job)
    return
  }
  if (job.cancelled) {
    job.stopCause = 'cancelled'
    throw continueFailed(job)
  }
  const row = await options.run(() => authorizeContinue(options, job))
  if (job.phase === 'verify') {
    const snapshot = await options.refresh(job.binding, {
      userId: job.member.id,
      requireWritable: true,
    })
    if (snapshot?.banner.state !== 'merged')
      throw new HttpError(
        409,
        'workspace_not_merged',
        'Merge the pull request before you continue.',
      )
    job.defaultBranch = await options.defaultBranch(job.binding, job.member.id)
    job.baseBranch = await continueBase(options, job, snapshot)
    job.phase =
      row.state === 'stopped' ||
      row.state === 'error' ||
      row.state === 'starting'
        ? 'resume'
        : 'check'
    await progress.save(job)
    return
  }
  if (job.phase === 'resume') {
    if (!job.resumeQueued || row.state === 'stopped') {
      job.resumeQueued = true
      await progress.save(job)
      try {
        await options.resume(job.binding.orgId, job.binding.id, job.member.id)
      } catch (error) {
        job.stopCause = 'sandbox-start-failed'
        throw error
      }
      return
    }
    if (row.state === 'starting') return
    if (row.state === 'error') {
      job.stopCause = 'sandbox-start-failed'
      throw continueFailed(job)
    }
    job.phase = 'check'
    await progress.save(job)
    return
  }
  if (job.phase === 'check') {
    const localWork = await readContinueWork(
      options.env,
      options.dependencies,
      job.binding.orgId,
      job.binding.id,
      job.member.id,
    )
    await options.run(() => authorizeContinue(options, job))
    if (
      !job.request.allowLocalWork &&
      (localWork.uncommittedFiles.length || localWork.unpushedCommits)
    ) {
      await progress.finish(job, {
        ok: true,
        value: {
          state: 'confirmation-required',
          branch: job.binding.branch,
          baseBranch: job.baseBranch,
          localWork,
        },
      })
      return
    }
    job.phase = 'fetch'
    await progress.save(job)
    return
  }
  const provider = continueProvider(options, job)
  if (!(await advanceContinueCommand(provider, options, progress, job))) return
  await completeCommand(progress, job)
}

async function completeCommand(progress: ContinueProgress, job: ContinueJob) {
  progress.scope = null
  if (job.phase === 'fetch' && (job.cancelled || job.failure)) {
    const error = job.failure ?? continueFailed(job)
    await progress.finish(job, {
      ok: false,
      error: { status: error.status, code: error.code, message: error.message },
    })
    return
  }
  job.stopCause = 'unknown'
  job.phase = job.phase === 'fetch' ? 'move' : 'publish'
  job.processId = null
  job.commandStarted = false
  job.stdoutOffset = 0
  job.stderrOffset = 0
  await progress.save(job)
}

async function settleContinueCommand(
  options: ContinueOptions,
  progress: ContinueProgress,
  job: ContinueJob,
) {
  try {
    await options.run(() => authorizeContinue(options, job))
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
  const provider = continueProvider(options, job)
  if (await advanceContinueCommand(provider, options, progress, job))
    await completeCommand(progress, job)
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

async function advanceContinueCommand(
  provider: SandboxProvider,
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
      const started = await provider.startCommand(
        job.sandboxId,
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
      if (!job.cancelled) job.stopCause = 'unknown'
      await progress.save(job)
    } catch {
      progress.scope = null
      if (!job.cancelled) job.stopCause = 'command-start-uncertain'
      await progress.save(job)
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
  if (!status.more && !status.running && !job.cancelled && !job.failure)
    job.stopCause = continueCommandStopCause(job.phase, status)
  await progress.save(job)
  if (status.more || status.running) return false
  if (status.state === 'lost') {
    if (job.phase === 'move' && (await switchedBranch(provider, progress, job)))
      return true
    job.processId = null
    await progress.save(job)
    return false
  }
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut) {
    if (job.phase === 'move' && (await switchedBranch(provider, progress, job)))
      return true
    const error = job.failure ?? continueFailed(job)
    await progress.finish(job, {
      ok: false,
      error: { status: error.status, code: error.code, message: error.message },
    })
    return false
  }
  return true
}

async function switchedBranch(
  provider: SandboxProvider,
  progress: ContinueProgress,
  job: ContinueJob,
): Promise<boolean> {
  const result = await provider.runCommand(
    job.sandboxId,
    continueBranchCommand(job),
  )
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
