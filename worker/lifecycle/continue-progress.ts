import { HttpError } from '../http'
import { continueBase } from './continue-base'
import { advanceContinueCommand } from './continue-command'
import { authorizeContinue } from './continue-data'
import { continueFailed } from './continue-failure'
import { publishContinue } from './continue-publication'
import type { ContinueJob, ContinueOptions } from './continue-types'
import { readContinueWork } from './continue-work'

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
    await advanceContinueCommand(options, progress, job)
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
  await advanceContinueCommand(options, progress, job)
}
