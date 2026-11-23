import type { AppDependencies, AppEnv } from '../env'
import type { GitHubSnapshot } from '../github/contracts'
import { moveWorkspaceBase } from '../github/base-data'
import type { ReceiverStorage } from '../members/receiver-storage'
import { scheduleWorkspaceAlarm } from '../features/alarms'
import { providerForAccount } from '../sandbox/client'
import {
  baseChangeWorkspace,
  baseChangeComputerReady,
} from './base-change-access'
import {
  BASE_CHANGE_JOB_KEY,
  sameBaseChangeJob,
  type BaseChangeJob,
} from './base-change-job'
import { currentRepositoryDefaultJob } from './repository-default-job'
import { closeRepositoryDefaultWrites } from './repository-default-data'
import { baseChangeInstallCommand } from './base-change-commands'
import { WorkspaceBaseFetches } from './base-change-fetch'
import { pendingWorkspaceChange } from './repository-change-types'
import { repositoryLocation } from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'
import { moveQueueBase } from './queue-base-change'

interface FetchScope {
  revision: string | undefined
  ownerUserId: string
  sandboxId: string
  providerAccount: string
}

/** One saved job owns the D1 repair, isolated fetch, settings, and retry. */
export class WorkspaceBaseChanges {
  private advancing: Promise<void> = Promise.resolve()
  readonly fetches = new WorkspaceBaseFetches()
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly storage: ReceiverStorage

  constructor(
    env: AppEnv,
    dependencies: AppDependencies,
    storage: ReceiverStorage,
  ) {
    this.env = env
    this.dependencies = dependencies
    this.storage = storage
  }

  advance(force = false): Promise<void> {
    const work = this.advancing.then(() => this.advanceOwned(force))
    this.advancing = work.catch(() => undefined)
    return work
  }

  /** Startup must keep the old target even when this attempt fails. */
  async resume(): Promise<boolean> {
    const pending = await this.storage.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    if (!pending) return false
    await this.advance(true).catch(() => undefined)
    return true
  }

  private async advanceOwned(force: boolean): Promise<void> {
    let job = await this.storage.get<BaseChangeJob | null>(BASE_CHANGE_JOB_KEY)
    if (!job || (!force && job.at > this.dependencies.now())) return
    try {
      const resolved = await currentRepositoryDefaultJob(
        this.env.DB,
        this.storage,
        job,
      )
      if (!resolved) return await this.finish(job)
      job = resolved
      const currentJob = job
      let moved
      if (job.queueBase) moved = await moveQueueBase(this.env.DB, job)
      else {
        const current = await baseChangeWorkspace(this.env.DB, job)
        if (!current)
          return job.repositoryBeforeSave
            ? await this.retry(job)
            : await this.finish(job)
        moved = await moveWorkspaceBase(
          this.env.DB,
          current.binding,
          job.change,
        )
      }
      if (!moved) return await this.finish(job)
      if (await pendingWorkspaceChange(this.storage))
        return await this.retry(job)
      const row = (await baseChangeWorkspace(this.env.DB, job))?.row
      if (!row)
        return job.repositoryBeforeSave
          ? await this.retry(job)
          : await this.finish(job)
      if (job.queueBase && row.sandboxId === null) return await this.finish(job)
      if (!baseChangeComputerReady(row) || !row.sandboxId)
        return await this.retry(job)
      const source = {
        stage: `/tmp/conductive-base-change/${encodeURIComponent(job.id)}/${encodeURIComponent(job.revision ?? 'legacy')}/source.git`,
        baseBranch: job.change.to,
        directory: repositoryLocation(
          await workspaceRepositoryLocations(this.env.DB, row.id),
          row.repositoryId,
        ),
        branch: job.binding.branch,
      }
      const provider = providerForAccount(
        this.env,
        this.dependencies.fetch,
        row.providerAccount,
      )
      const scope: FetchScope = {
        revision: job.revision,
        ownerUserId: row.ownerUserId,
        sandboxId: row.sandboxId,
        providerAccount: row.providerAccount,
      }
      const fetched = await this.fetches.fetch(
        provider,
        row.sandboxId,
        {
          ...source,
          fetchId: job.id,
          fullName: job.binding.fullName,
        },
        {
          ownerUserId: scope.ownerUserId,
          authorize: () => this.authorizeFetch(currentJob, scope),
        },
      )
      if (!fetched) return await this.retry(job)
      if (!(await this.authorizeFetch(job, scope))) return await this.retry(job)
      const result = await provider.runCommand(
        row.sandboxId,
        baseChangeInstallCommand(source),
      )
      if (result.exitCode !== 0 || result.timedOut) return await this.retry(job)
      if (!(await this.authorizeFetch(job, scope))) return await this.retry(job)
      if (job.repositoryDeliveries?.length) {
        await closeRepositoryDefaultWrites(
          this.env.DB,
          job.repositoryDeliveries,
          this.dependencies.now(),
        )
        return await this.retry(job)
      }
      await this.finish(job)
    } catch {
      // Provider output and credentials never enter the saved job or its logs.
      await this.retry(job)
    }
  }

  private async authorizeFetch(
    job: BaseChangeJob,
    scope: FetchScope,
  ): Promise<boolean> {
    const pending = await this.storage.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    if (!sameBaseChangeJob(pending, job) || scope.revision !== job.revision)
      return false
    const current = await baseChangeWorkspace(this.env.DB, pending)
    return Boolean(
      current &&
      baseChangeComputerReady(current.row) &&
      current.row.ownerUserId === scope.ownerUserId &&
      current.row.sandboxId === scope.sandboxId &&
      current.row.providerAccount === scope.providerAccount &&
      !(await pendingWorkspaceChange(this.storage)),
    )
  }

  credentialSender(fetchId: string): Promise<string | null | undefined> {
    return this.fetches.credentialSender(fetchId)
  }

  private async retry(job: BaseChangeJob): Promise<void> {
    const delay = Math.min(1_000 * 2 ** Math.min(job.failures, 10), 15 * 60_000)
    await this.storage.transaction(async (transaction) => {
      const pending = await transaction.get<BaseChangeJob | null>(
        BASE_CHANGE_JOB_KEY,
      )
      if (!sameBaseChangeJob(pending, job)) return
      const at = this.dependencies.now() + delay
      await transaction.put(BASE_CHANGE_JOB_KEY, {
        ...job,
        failures: Math.min(job.failures + 1, 10),
        at,
      })
      await transaction.put('alarm:baseChange', at)
      await scheduleWorkspaceAlarm(transaction)
    })
  }

  private async finish(job: BaseChangeJob): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      const pending = await transaction.get<BaseChangeJob | null>(
        BASE_CHANGE_JOB_KEY,
      )
      if (!sameBaseChangeJob(pending, job)) return
      const snapshot = await transaction.get<GitHubSnapshot>('github:state')
      if (
        snapshot?.banner.branch === job.binding.branch &&
        snapshot.baseChange?.from === job.change.from &&
        (snapshot.baseChange.to === job.change.to || job.repositoryBeforeSave)
      ) {
        const rest = { ...snapshot }
        delete rest.baseChange
        await transaction.put('github:state', rest)
      }
      await transaction.delete(BASE_CHANGE_JOB_KEY)
      await transaction.delete('alarm:baseChange')
      await scheduleWorkspaceAlarm(transaction)
    })
  }
}
