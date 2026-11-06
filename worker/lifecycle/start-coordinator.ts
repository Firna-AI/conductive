import type {
  WorkspaceStartJob,
  WorkspaceStartResult,
  StartJobStorage,
} from './start-types'
import type { AppDependencies, AppEnv } from '../env'
import { prepareWorkspaceRecords } from './start-records'
import { completeCreationAttempt } from './creation-attempt-data'
import { HttpError } from '../http'
import { lifecycleProvider } from './lifecycle-provider'
import type { SandboxProvider } from '../sandbox/provider'
import { readWorkspace } from './workspace-data'
import { finishFailedStart } from './start-failure'
import { repositoryDirectory, shellQuote } from './commands'
import { workspaceStartupCommand } from './image-software'
import { firstOrgAdmin, workspaceEnvironment } from './settings-data'
import { readWorkspaceToken } from './tokens'
import { WorkspaceStartError } from './workspace-start'
import { advanceStartMachine } from './start-machine'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

/** The actor's alarm owns progress. Waiting HTTP requests own no phase. */
export class WorkspaceStartCoordinator {
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly endpoint: WorkspaceLifecycleEndpoint
  private readonly storage: StartJobStorage
  private readonly waiters = new Set<(result: WorkspaceStartResult) => void>()
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
    return new Promise((resolve, reject) => {
      const receive = (result: WorkspaceStartResult) => {
        this.waiters.delete(receive)
        resolve(result)
      }
      this.waiters.add(receive)
      void this.storage.result().then(
        (stored) => {
          if (stored) receive(stored)
        },
        (error: unknown) => {
          this.waiters.delete(receive)
          reject(error)
        },
      )
    })
  }

  advance(): Promise<boolean> {
    const next = this.accepting.then(() => this.advanceOwned())
    this.accepting = next.catch(() => undefined)
    return next
  }

  private async advanceOwned(): Promise<boolean> {
    const job = await this.storage.job()
    if (!job) return true
    let provider: SandboxProvider | undefined
    try {
      const admin = await firstOrgAdmin(this.env.DB, job.orgId)
      if (!admin)
        throw new HttpError(404, 'org_not_found', 'The org is not available.')
      provider = await lifecycleProvider(
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
      if (job.phase === 'records') {
        job.imageName = await prepareWorkspaceRecords(
          this.env,
          this.dependencies,
          this.endpoint,
          job,
        )
        await this.next(job, 'machine')
        return false
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
        const directory = shellQuote(repositoryDirectory(row.repositoryId))
        const command =
          job.phase === 'startup'
            ? workspaceStartupCommand(job.startupScript)
            : `set -eu\nexport CONDUCTING_TURN_ID=${shellQuote(job.turnId)}\ncd ${directory}\n${job.phase === 'fetch' ? `git fetch origin ${shellQuote(job.defaultBranch)}` : `git checkout -b ${shellQuote(row.branch)} FETCH_HEAD`}`
        const started = await provider.startCommand(row.sandboxId, command)
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
      await this.endpoint.lifecycleStep(
        job.phase,
        stepLabel(job.phase),
        'completed',
      )
      if (job.phase !== 'startup') {
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
    job: WorkspaceStartJob,
    phase: WorkspaceStartJob['phase'],
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
    if (result.ok && job?.kind === 'create')
      await completeCreationAttempt(this.env.DB, job.workspaceId)
    await this.storage.complete(result)
    const stored = (await this.storage.result()) ?? result
    for (const waiter of this.waiters) waiter(stored)
    this.waiters.clear()
  }
}

function stepLabel(phase: WorkspaceStartJob['phase']): string {
  return phase === 'fetch'
    ? 'Fetching the default branch'
    : phase === 'branch'
      ? 'Creating your branch'
      : 'Applying your startup script'
}
