import type {
  WorkspaceStartJob,
  WorkspaceStartResult,
  StartJobStorage,
  WorkspaceCreationAdmission,
  WorkspaceRunningStartJob,
  WorkspaceMachinePhase,
} from './start-types'
import type { AppDependencies, AppEnv } from '../env'
import { prepareWorkspaceRecords } from './start-records'
import { publishCreationResult } from './creation-publication'
import { HttpError } from '../http'
import { startWorkspaceTerminal } from '../terminal/service'
import { orgSandboxProvider } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { readWorkspace } from './workspace-data'
import { finishFailedStart } from './start-failure'
import { workspacePhaseCommand } from './start-command'
import { firstOrgAdmin, workspaceEnvironment } from './settings-data'
import { readWorkspaceToken } from './tokens'
import { WorkspaceStartError } from './workspace-start'
import { advanceStartMachine } from './start-machine'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { creationAdmissionResponse } from './creation-admission-response'
import { StartWaiters } from './start-waiters'

/** The actor's alarm owns progress. Waiting HTTP requests own no phase. */
export class WorkspaceStartCoordinator {
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly endpoint: WorkspaceLifecycleEndpoint
  private readonly storage: StartJobStorage
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
  ) {
    this.env = env
    this.dependencies = dependencies
    this.endpoint = endpoint
    this.storage = storage
  }

  enqueue(job: WorkspaceStartJob): Promise<boolean> {
    const accepted = this.accepting.then(async () => {
      if (job.kind === 'create' && (await this.storage.creationResult()))
        return false
      if (await this.storage.job()) return false
      const epoch = await this.storage.epoch()
      const state = await this.endpoint.readLifecycle()
      if (
        job.kind === 'resume' &&
        state?.state !== 'stopped' &&
        state?.state !== 'error'
      )
        return false
      if (job.kind === 'resume') await this.endpoint.finishDiskMaintenance()
      if (!(await this.storage.begin(job, epoch))) return false
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

  advance(): Promise<boolean> {
    const next = this.accepting.then(() => this.advanceOwned())
    this.accepting = next.catch(() => undefined)
    return next
  }

  private async advanceOwned(): Promise<boolean> {
    const job = await this.storage.job()
    if (!job) return publishCreationResult(this.env, this.storage)
    let provider: SandboxProvider | undefined
    try {
      if (job.phase === 'records' && !job.cancelled && !job.failure) {
        const imageName = await prepareWorkspaceRecords(
          this.env,
          this.dependencies,
          this.endpoint,
          job,
        )
        if (imageName === null) return false
        const created = await creationAdmissionResponse(
          this.env,
          this.endpoint,
          job,
        )
        await this.storage.update({
          ...job,
          phase: 'machine',
          imageName,
          admission: created,
          processId: null,
          stdoutOffset: 0,
          stderrOffset: 0,
        })
        const admitted = await this.storage.admission()
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
        )
        if (result) await this.finish(result)
        return result !== null
      }
      const row = await readWorkspace(this.env.DB, job.orgId, job.workspaceId)
      if (row.archivedAt !== null || row.state === 'archived') {
        await this.cancel()
        return false
      }
      const state = await this.endpoint.readLifecycle()
      if (!state?.start || state.state === 'stopped' || state.state === 'error')
        await this.endpoint.beginLifecycleStart(job.kind)
      if (job.phase === 'machine' || job.phase === 'ready') {
        const next = await advanceStartMachine(
          this.env,
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
            processId: null,
            stdoutOffset: 0,
            stderrOffset: 0,
          })
        return false
      }
      if (!row.sandboxId) throw new WorkspaceStartError(null)
      await provider.setAutoStop(row.sandboxId, 1_800)
      if (job.processId === null) {
        const values = await workspaceEnvironment(
          this.env,
          job.orgId,
          job.environmentCiphertext,
        )
        await this.storage.secrets([
          await readWorkspaceToken(this.env, job.workspaceId),
          ...Object.values(values),
        ])
        await this.endpoint.lifecycleStep(
          job.phase,
          stepLabel(job.phase),
          'running',
        )
        const started = await provider.startCommand(
          row.sandboxId,
          workspacePhaseCommand(row, job),
        )
        await this.storage.update({ ...job, processId: started.processId })
        return false
      }
      const status = await provider.getCommandStatus(
        row.sandboxId,
        job.processId,
        { stdoutOffset: job.stdoutOffset, stderrOffset: job.stderrOffset },
      )
      await this.storage.capture(job, status)
      if (status.more || status.running) return false
      if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut)
        throw new WorkspaceStartError(null)
      if (job.phase === 'startup')
        await startWorkspaceTerminal(
          this.env,
          job.orgId,
          job.workspaceId,
          this.dependencies,
        )
      await this.endpoint.lifecycleStep(
        job.phase,
        stepLabel(job.phase),
        'completed',
      )
      if (job.phase === 'fetch' || job.phase === 'branch') {
        await this.next(job, job.phase === 'fetch' ? 'branch' : 'startup')
        return false
      }
      if (!(await this.endpoint.readLifecycle())?.runnerConnected)
        await this.endpoint.lifecycleStep(
          'runner',
          'Starting the agent',
          'running',
        )
      await this.endpoint.lifecyclePrepared()
      await this.finish({ ok: true })
      return true
    } catch (error) {
      const failure =
        error instanceof HttpError ? error : new WorkspaceStartError(null)
      const failedJob = {
        ...job,
        failure: job.failure ?? {
          code: failure.code,
          message: failure.message,
          status: failure.status,
        },
      }
      await this.storage.update(failedJob)
      const result = await finishFailedStart(
        this.env,
        this.endpoint,
        this.storage,
        failedJob,
        provider,
      )
      if (result) await this.finish(result)
      return result !== null
    }
  }

  async cancel(): Promise<void> {
    if (await this.storage.stop()) await this.storage.schedule()
  }

  private async next(
    job: WorkspaceRunningStartJob,
    phase: WorkspaceMachinePhase,
  ): Promise<void> {
    await this.storage.update({
      ...job,
      phase,
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
    })
  }

  private async finish(result: WorkspaceStartResult): Promise<void> {
    const job = await this.storage.job()
    if (result.ok && job?.cancelled) return
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

function stepLabel(phase: WorkspaceStartJob['phase']): string {
  return phase === 'fetch'
    ? 'Fetching the default branch'
    : phase === 'branch'
      ? 'Creating your branch'
      : 'Applying your startup script'
}
