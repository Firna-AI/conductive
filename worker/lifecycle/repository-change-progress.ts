import {
  repositoryChangeFailed,
  softwareOutdated,
} from './repository-change-errors'
import { advanceRepositoryChangeCommand } from './repository-change-command'
import { authorizeRepositoryChange } from './repository-change-data'
import { publishRepositoryChange } from './repository-change-publication'
import type {
  RepositoryChangeJob,
  RepositoryChangeOptions,
} from './repository-change-types'
import {
  hasRepositoryChangeWork,
  readRepositoryChangeWork,
} from './repository-change-work'

/** A runner that has not said hello within this time ends the change. */
const RUNNER_WAIT_MS = 3 * 60 * 1_000

export interface RepositoryChangeProgress {
  scope: string | null
  save(job: RepositoryChangeJob): Promise<void>
  finish(
    job: RepositoryChangeJob,
    result: NonNullable<RepositoryChangeJob['outcome']>,
  ): Promise<void>
}

/** Advances the job by one phase. A provider wait never holds the chat queue. */
export async function advanceRepositoryChange(
  options: RepositoryChangeOptions,
  progress: RepositoryChangeProgress,
  job: RepositoryChangeJob,
): Promise<void> {
  if (job.phase === 'publish') {
    progress.scope = null
    await publishRepositoryChange(options, job)
    return
  }
  if (job.phase === 'fetch' || job.phase === 'move') {
    await advanceRepositoryChangeCommand(options, progress, job)
    return
  }
  if (job.cancelled) throw repositoryChangeFailed(job)
  const row = await options.run(() => authorizeRepositoryChange(options, job))
  if (job.phase === 'verify') {
    job.baseBranch = await options.defaultBranch(
      job.binding,
      job.target.binding,
      job.member.id,
    )
    job.target = {
      ...job.target,
      binding: {
        ...job.target.binding,
        defaultBranch: job.baseBranch,
        baseBranch: null,
      },
    }
    job.oldBranch = await options.oldBranchWork(job.binding, job.member.id)
    job.phase = ['stopped', 'error', 'starting'].includes(row.state)
      ? 'resume'
      : 'runner'
    await progress.save(job)
    return
  }
  if (job.phase === 'resume') {
    if (!job.resumeQueued || row.state === 'stopped') {
      job.resumeQueued = true
      await progress.save(job)
      await options.resume(job.binding.orgId, job.binding.id, job.member.id)
      return
    }
    if (row.state === 'starting') return
    if (row.state === 'error') throw repositoryChangeFailed(job)
    job.phase = 'runner'
    await progress.save(job)
    return
  }
  if (job.phase === 'runner') {
    const runner = await options.runner()
    const now = options.dependencies.now()
    if (runner.state === 'hello') {
      if (!runner.canMove) throw softwareOutdated()
      job.phase = 'check'
    } else if (job.runnerSince === undefined) job.runnerSince = now
    else if (now - job.runnerSince >= RUNNER_WAIT_MS)
      throw repositoryChangeFailed(job)
    else return
    await progress.save(job)
    return
  }
  const work = await readRepositoryChangeWork(options, job)
  await options.run(() => authorizeRepositoryChange(options, job))
  if (!job.request.allowWork && hasRepositoryChangeWork(work)) {
    await progress.finish(job, {
      ok: true,
      value: {
        state: 'confirmation-required',
        repository: {
          id: job.target.repositoryId,
          fullName: job.target.fullName,
        },
        branch: job.binding.branch,
        baseBranch: job.baseBranch,
        work,
      },
    })
    return
  }
  job.phase = 'fetch'
  await progress.save(job)
}
