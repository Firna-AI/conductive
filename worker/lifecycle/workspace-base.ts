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
import { BASE_CHANGE_JOB_KEY, type BaseChangeJob } from './base-change-job'
import {
  baseChangeFetchCommand,
  baseChangeInstallCommand,
} from './base-change-commands'
import { pendingWorkspaceChange } from './repository-change-types'
import { repositoryLocation } from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'

interface FetchScope {
  id: string
  ownerUserId: string
  sandboxId: string
  providerAccount: string
}

/** One saved job owns the D1 repair, isolated fetch, settings, and retry. */
export class WorkspaceBaseChanges {
  private advancing: Promise<void> = Promise.resolve()
  private scope: FetchScope | null = null
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
    const job = await this.storage.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    if (!job || (!force && job.at > this.dependencies.now())) return
    try {
      const current = await baseChangeWorkspace(this.env.DB, job)
      if (!current) return await this.finish(job)
      const moved = await moveWorkspaceBase(
        this.env.DB,
        current.binding,
        job.change,
      )
      if (!moved) return await this.finish(job)
      if (await pendingWorkspaceChange(this.storage))
        return await this.retry(job)
      const row = (await baseChangeWorkspace(this.env.DB, job))?.row
      if (!row) return await this.finish(job)
      if (!baseChangeComputerReady(row) || !row.sandboxId)
        return await this.retry(job)
      const source = {
        stage: `/tmp/conductive-base-change/${encodeURIComponent(job.id)}/source.git`,
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
        id: job.id,
        ownerUserId: row.ownerUserId,
        sandboxId: row.sandboxId,
        providerAccount: row.providerAccount,
      }
      if (!(await this.authorizeFetch(job, scope))) return await this.retry(job)
      this.scope = scope
      let fetched = false
      try {
        const result = await provider.runCommand(
          row.sandboxId,
          baseChangeFetchCommand({
            ...source,
            fetchId: job.id,
            fullName: job.binding.fullName,
          }),
        )
        fetched = result.exitCode === 0 && !result.timedOut
      } finally {
        this.scope = null
      }
      if (!fetched) return await this.retry(job)
      if (!(await this.authorizeFetch(job, scope))) return await this.retry(job)
      const result = await provider.runCommand(
        row.sandboxId,
        baseChangeInstallCommand(source),
      )
      if (result.exitCode !== 0 || result.timedOut) return await this.retry(job)
      await this.finish(job)
    } catch {
      // Provider output and credentials never enter the saved job or its logs.
      await this.retry(job)
    } finally {
      this.scope = null
    }
  }

  private async authorizeFetch(
    job: BaseChangeJob,
    scope: FetchScope,
  ): Promise<boolean> {
    const pending = await this.storage.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    if (pending?.id !== job.id) return false
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

  async credentialSender(fetchId: string): Promise<string | null | undefined> {
    if (!fetchId.startsWith('baseChange-')) return undefined
    const scope = this.scope
    if (!scope || scope.id !== fetchId) return null
    const job = await this.storage.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    if (!job || !(await this.authorizeFetch(job, scope))) return null
    return this.scope === scope ? scope.ownerUserId : null
  }

  private async retry(job: BaseChangeJob): Promise<void> {
    const delay = Math.min(1_000 * 2 ** Math.min(job.failures, 10), 15 * 60_000)
    await this.storage.transaction(async (transaction) => {
      const pending = await transaction.get<BaseChangeJob | null>(
        BASE_CHANGE_JOB_KEY,
      )
      if (pending?.id !== job.id) return
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
      if (pending?.id !== job.id) return
      const snapshot = await transaction.get<GitHubSnapshot>('github:state')
      if (
        snapshot?.banner.branch === job.binding.branch &&
        snapshot.baseChange?.from === job.change.from &&
        snapshot.baseChange.to === job.change.to
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
