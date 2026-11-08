import type {
  WorkspaceStartJob,
  WorkspaceStartResult,
  StartJobStorage,
  WorkspaceCreationAdmission,
} from './start-types'
import type { AppDependencies, AppEnv } from '../env'
import { advanceStartRecords } from './start-records'
import { publishCreationResult } from './creation-publication'
import { HttpError } from '../http'
import { orgSandboxProvider } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { readWorkspace } from './workspace-data'
import {
  failedStartJob,
  finishFailedStart,
  type ResumeStartFailure,
} from './start-failure'
import { firstOrgAdmin } from './settings-data'
import { advanceStartMachine } from './start-machine'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { StartWaiters } from './start-waiters'
import { requireActiveStartUsers } from './start-access'
import { advanceStartSteps } from './start-progress'
import {
  providerRetryPending,
  providerRetryExpired,
  ProviderRetryExhausted,
} from './provider-retry'
import {
  readStartForAdvance,
  retryStartError,
  startDeadlineAt,
  startTimeLimitReached,
} from './start-provider-retry'
import { JobTimeLimit } from './job-time-limit'
import { applyStartRunnerReady } from './start-runner'

/** The actor's alarm owns progress. Waiting HTTP requests own no phase. */
export class WorkspaceStartCoordinator {
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly endpoint: WorkspaceLifecycleEndpoint
  private readonly storage: StartJobStorage
  private readonly finishResumeFailure: ResumeStartFailure
  private readonly waiters = new StartWaiters<WorkspaceStartResult>()
  private readonly creationWaiters = new StartWaiters<WorkspaceStartResult>()
  private readonly admissionWaiters =
    new StartWaiters<WorkspaceCreationAdmission>()
  private accepting: Promise<unknown> = Promise.resolve()

  constructor(
    env: AppEnv,
    dependencies: AppDependencies,
    endpoint: WorkspaceLifecycleEndpoint,
    storage: StartJobStorage,
    finishResumeFailure: ResumeStartFailure,
  ) {
    this.env = env
    this.dependencies = dependencies
    this.endpoint = endpoint
    this.storage = storage
    this.finishResumeFailure = finishResumeFailure
  }

  enqueue(job: WorkspaceStartJob): Promise<boolean> {
    const accepted = this.accepting.then(async () => {
      if (job.kind === 'create' && (await this.storage.creationResult()))
        return false
      if (await this.storage.job()) return false
      await requireActiveStartUsers(this.env.DB, job)
      const epoch = await this.storage.epoch()
      const state = await this.endpoint.readLifecycle()
      if (state?.startStop === 'pending') return false
      if (
        job.kind === 'resume' &&
        state?.state !== 'stopped' &&
        state?.state !== 'error'
      )
        return false
      if (job.kind === 'resume') await this.endpoint.finishDiskMaintenance()
      if (
        !(await this.storage.begin(
          {
            ...job,
            deadlineAt: startDeadlineAt(job, this.dependencies.now()),
          },
          epoch,
        ))
      )
        return false
      await this.endpoint.beginLifecycleStart(job.kind)
      await this.storage.schedule()
      return true
    })
    this.accepting = accepted.catch(() => undefined)
    return accepted
  }

  wait(): Promise<WorkspaceStartResult> {
    return this.waiters.wait(() => this.storage.result())
  }
  waitCreation(): Promise<WorkspaceStartResult> {
    return this.creationWaiters.wait(() => this.storage.creationResult())
  }
  creationResult() {
    return this.storage.creationResult()
  }
  waitAdmission(): Promise<WorkspaceCreationAdmission> {
    return this.admissionWaiters.wait(() => this.storage.admission())
  }
  async pending(): Promise<boolean> {
    return Boolean(
      (await this.storage.job()) || (await this.storage.publication()),
    )
  }

  reportRunnerReady(apply: () => Promise<void>): Promise<void> {
    return applyStartRunnerReady(
      this.env,
      this.storage,
      this.endpoint,
      this.dependencies.now,
      apply,
    )
  }

  advance(): Promise<boolean> {
    const next = this.accepting.then(() => this.advanceOwned())
    this.accepting = next.catch(() => undefined)
    return next
  }

  private async advanceOwned(): Promise<boolean> {
    const job = await readStartForAdvance(
      this.storage,
      this.endpoint,
      this.dependencies.now(),
    )
    if (!job) return publishCreationResult(this.env, this.storage)
    const expired = startTimeLimitReached(job, this.dependencies.now())
    let provider: SandboxProvider | undefined
    try {
      if (job.phase === 'runner' && !job.cancelled && !job.failure) {
        await requireActiveStartUsers(this.env.DB, job)
        if (!expired && !(await this.endpoint.readLifecycle())?.runnerConnected)
          return false
      }
      if (job.phase === 'records' && !job.cancelled && !job.failure) {
        await requireActiveStartUsers(this.env.DB, job)
        if (expired) throw new JobTimeLimit('start')
        if (providerRetryPending(job.providerRetry, this.dependencies.now()))
          return false
        const admitted = await advanceStartRecords(
          this.env,
          this.dependencies,
          this.endpoint,
          this.storage,
          job,
        )
        if (admitted) this.admissionWaiters.publish(admitted)
        return false
      }
      const admin = await firstOrgAdmin(this.env.DB, job.orgId)
      if (!admin)
        throw new HttpError(404, 'org_not_found', 'The org is not available.')
      provider = await orgSandboxProvider(
        this.env,
        admin.userId,
        job.orgId,
        this.dependencies.fetch,
      )
      if (job.cancelled || job.failure) {
        const result = await finishFailedStart(
          this.env,
          this.endpoint,
          this.storage,
          job,
          provider,
          this.dependencies.now,
          this.finishResumeFailure,
        )
        if (result) await this.finish(result)
        return result !== null
      }
      await requireActiveStartUsers(this.env.DB, job)
      if (expired) throw new JobTimeLimit('start')
      if (providerRetryPending(job.providerRetry, this.dependencies.now()))
        return false
      if (providerRetryExpired(job.providerRetry, this.dependencies.now()))
        throw new ProviderRetryExhausted()
      const row = await readWorkspace(this.env.DB, job.orgId, job.workspaceId)
      if (row.archivedAt !== null || row.state === 'archived') {
        await this.cancel()
        return false
      }
      const state = await this.endpoint.readLifecycle()
      if (!state?.start || state.state === 'stopped' || state.state === 'error')
        await this.endpoint.beginLifecycleStart(job.kind)
      if (job.phase === 'runner') {
        await this.finish({ ok: true })
        return true
      }
      if (job.phase === 'machine' || job.phase === 'ready') {
        const next = await advanceStartMachine(
          this.env,
          this.dependencies,
          this.endpoint,
          provider,
          row,
          job,
          this.storage,
        )
        if (next)
          await this.storage.update({
            ...job,
            ...next,
            providerRetry: null,
            processId: null,
            stdoutOffset: 0,
            stderrOffset: 0,
          })
        else await this.storage.retry(job.attempt, 'progress')
        return false
      }
      if (
        !(await advanceStartSteps(
          this.env,
          this.dependencies,
          this.endpoint,
          this.storage,
          provider,
          row,
          job,
        ))
      )
        return false
      if (!(await this.endpoint.readLifecycle())?.runnerConnected) return false
      await this.finish({ ok: true })
      return true
    } catch (error) {
      if (await retryStartError(this.storage, error, this.dependencies.now()))
        return false
      const current = (await this.storage.job()) ?? job
      const failedJob = failedStartJob(current, error, this.dependencies.now())
      await this.storage.update(failedJob)
      const result = await finishFailedStart(
        this.env,
        this.endpoint,
        this.storage,
        failedJob,
        provider,
        this.dependencies.now,
        this.finishResumeFailure,
      )
      if (result) await this.finish(result)
      return result !== null
    }
  }

  async cancel(): Promise<void> {
    if (await this.storage.stop()) await this.storage.schedule()
  }

  private async finish(result: WorkspaceStartResult): Promise<void> {
    const job = await this.storage.job()
    if (result.ok && job?.cancelled) return
    if (result.ok && job && startTimeLimitReached(job, this.dependencies.now()))
      throw new JobTimeLimit('start')
    await this.storage.complete(result)
    const stored = (await this.storage.result()) ?? result
    if (job?.kind === 'create') {
      const admission = await this.storage.admission()
      if (admission) this.admissionWaiters.publish(admission)
      const created = (await this.storage.creationResult()) ?? stored
      this.creationWaiters.publish(created)
      await publishCreationResult(this.env, this.storage)
    }
    this.waiters.publish(stored)
  }
}
