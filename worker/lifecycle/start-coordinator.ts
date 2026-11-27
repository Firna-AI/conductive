import type {
  WorkspaceStartJob,
  WorkspaceStartIntent,
  WorkspaceStartResult,
  StartJobStorage,
  WorkspaceCreationAdmission,
} from './start-types'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { advanceStartRecords } from './start-records'
import { waitCreationAdmission } from './creation-admission-wait'
import { publishCreationResult } from './creation-publication'
import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import type { SandboxProvider } from '../sandbox/provider'
import {
  failedStartJob,
  finishFailedStart,
  type ResumeStartFailure,
} from './start-failure'
import { requireActiveOrg } from '../data/user-access'
import type { WorkspaceController } from './workspace-controller-types'
import { abortStartWaiters, StartWaiters } from './start-waiters'
import { requireActiveStartUsers, startProvider } from './start-access'
import {
  providerRetryPending,
  providerRetryExpired,
  ProviderRetryExhausted,
} from './provider-retry'
import {
  readStartForAdvance,
  retryStartError,
  startTimeLimitReached,
} from './start-provider-retry'
import { JobTimeLimit } from './job-time-limit'
import { applyStartRunnerReady } from './start-runner'
import {
  pollStartRestore,
  prepareStartSuccess,
  prepareStartRunner,
} from './start-completion'
import { finishArchivedStart, recoverArchivedStart } from './archive-start'
import { publishStartCompletion } from './start-result'
import { enqueueWorkspaceStart } from './start-admission'
import { queueStartAfterStop } from './start-after-stop'
import { advanceStartPhases } from './start-advance'
import type { QueueTurn } from '../chat/queue-turn'
import {
  StartSuperseded,
  startCallInPlace,
  type StartCall,
} from './start-guard'

/** The actor's alarm owns progress. Waiting HTTP requests own no phase. */
export class WorkspaceStartCoordinator {
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly endpoint: WorkspaceController
  private readonly storage: StartJobStorage
  private readonly finishResumeFailure: ResumeStartFailure
  private readonly waiters = new StartWaiters<WorkspaceStartResult>()
  private readonly creationWaiters = new StartWaiters<WorkspaceStartResult>()
  private readonly admissionWaiters =
    new StartWaiters<WorkspaceCreationAdmission>()
  private readonly guard: (turn?: QueueTurn) => StartCall

  constructor(
    env: AppEnv,
    dependencies: AppDependencies,
    endpoint: WorkspaceController,
    storage: StartJobStorage,
    finishResumeFailure: ResumeStartFailure,
    guard: (turn?: QueueTurn) => StartCall,
  ) {
    this.env = env
    this.dependencies = dependencies
    this.endpoint = endpoint
    this.storage = storage
    this.finishResumeFailure = finishResumeFailure
    this.guard = guard
  }

  enqueue(
    job: WorkspaceStartJob,
    intent: WorkspaceStartIntent = { kind: 'continue' },
  ): Promise<boolean> {
    return enqueueWorkspaceStart(
      this.env,
      this.dependencies,
      this.endpoint,
      this.storage,
      job,
      intent,
    )
  }

  /** Queues the start that a pending stop held, once that stop ends. */
  async startAfterStop(): Promise<void> {
    await queueStartAfterStop(
      {
        db: this.env.DB,
        storage: this.storage,
        state: await this.endpoint.readLifecycle(),
        now: this.dependencies.now(),
      },
      (job, intent) => this.enqueue(job, intent),
    )
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
  waitAdmission(timeoutMs?: number): Promise<WorkspaceCreationAdmission> {
    return waitCreationAdmission(this.storage, this.admissionWaiters, timeoutMs)
  }
  async pending(): Promise<boolean> {
    return Boolean(await this.storage.job())
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

  async runnerUnsupported(reason: string): Promise<void> {
    const job = await this.storage.job()
    if (!job || job.phase !== 'runner' || job.cancelled || job.failure) return
    const now = this.dependencies.now()
    await this.storage.update(
      failedStartJob(
        job,
        new HttpError(409, 'runner_protocol_unsupported', reason),
        now,
      ),
    )
    await this.storage.schedule(now)
  }

  async advance(turn?: QueueTurn): Promise<boolean> {
    const job = await readStartForAdvance(
      this.storage,
      this.endpoint,
      this.dependencies.now(),
    )
    if (!job) return publishCreationResult(this.env, this.storage)
    const call =
      job.cancelled || job.failure ? startCallInPlace : this.guard(turn)
    if (
      await recoverArchivedStart(
        this.env.DB,
        job.workspaceId,
        this.endpoint.archiveLifecycle,
        call,
      )
    )
      return true
    const expired = startTimeLimitReached(job, this.dependencies.now())
    const progress = {
      env: this.env,
      dependencies: this.dependencies,
      endpoint: this.endpoint,
      storage: this.storage,
      job,
      call,
    }
    let provider: SandboxProvider | undefined
    try {
      const current = await prepareStartRunner(progress)
      if (!current) return false
      if (job.phase === 'records' && !job.cancelled && !job.failure) {
        await call(() => requireActiveStartUsers(this.env.DB, job))
        if (expired) throw new JobTimeLimit('start')
        if (providerRetryPending(job.providerRetry, this.dependencies.now()))
          return false
        const admitted = await advanceStartRecords(
          this.env,
          this.dependencies,
          this.endpoint,
          this.storage,
          job,
          call,
        )
        if (admitted) this.admissionWaiters.publish(admitted)
        return false
      }
      provider = await call(async () => {
        const current = await startProvider(
          this.env,
          this.dependencies.fetch,
          job,
        )
        provider = current
        if (!job.cancelled && !job.failure)
          await requireActiveStartUsers(this.env.DB, job)
        return current
      })
      if (job.cancelled && !job.failure)
        await requireActiveOrg(this.env.DB, job.orgId)
      if (job.cancelled || job.failure) {
        const result = await finishFailedStart(
          this.env,
          this.endpoint,
          this.storage,
          job,
          provider,
          this.dependencies,
          this.finishResumeFailure,
        )
        if (result) await this.finish(result)
        return result !== null
      }
      if (expired) throw new JobTimeLimit('start')
      if (providerRetryPending(job.providerRetry, this.dependencies.now()))
        return false
      if (providerRetryExpired(job.providerRetry, this.dependencies.now()))
        throw new ProviderRetryExhausted()
      return await advanceStartPhases({
        ...progress,
        provider,
        job:
          job.phase === 'runner' ? current : await pollStartRestore(progress),
        finish: () => this.finish({ ok: true }, call),
      })
    } catch (error) {
      if (error instanceof StartSuperseded) throw error
      const current = (await this.storage.job()) ?? job
      warnWorker({
        kind: 'workspace_start_failed',
        workspaceId: WarningId.checked(current.workspaceId),
        phase: current.phase,
        error: errorSummary(error),
      })
      if (await retryStartError(this.storage, error, this.dependencies.now()))
        return false
      const failedJob = failedStartJob(current, error, this.dependencies.now())
      await this.storage.update(failedJob)
      const result = await finishFailedStart(
        this.env,
        this.endpoint,
        this.storage,
        failedJob,
        provider,
        this.dependencies,
        this.finishResumeFailure,
      )
      if (result) await this.finish(result)
      return result !== null
    }
  }

  async cancel(): Promise<void> {
    if (await this.storage.stop()) await this.storage.schedule()
  }

  archive(): Promise<void> {
    return finishArchivedStart(
      this.storage,
      [this.waiters, this.creationWaiters],
      this.admissionWaiters,
    )
  }

  abortWaiters(): void {
    abortStartWaiters(this.waiters, this.creationWaiters, this.admissionWaiters)
  }

  private finish(
    result: WorkspaceStartResult,
    call: StartCall = startCallInPlace,
  ): Promise<boolean> {
    return publishStartCompletion(
      this.env,
      this.storage,
      this.waiters,
      this.creationWaiters,
      this.admissionWaiters,
      result,
      () =>
        prepareStartSuccess(
          this.env,
          this.endpoint,
          this.storage,
          this.dependencies.now,
          call,
        ),
    )
  }
}
