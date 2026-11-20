import type { AppDependencies, AppEnv } from '../env'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import {
  computerIdentityKey,
  liveOrgComputer,
  type ComputerIdentity,
} from './computer-ledger'
import type { WorkspaceStorage, WorkspaceTransaction } from './platform-storage'
import { providerState } from './provider-state'
import { replyOrCurrentState } from './workspace-actions'
import { failedBackgroundRetry, nextBackgroundRetry } from './background-retry'

export const COMPUTER_STOP_TASK_KEY = 'lifecycle:computer-stops'

function retryKey(computer: ComputerIdentity): string {
  return `lifecycle:computer-stop-retry:${computerIdentityKey(computer)}`
}

export interface ComputerStopTaskState {
  orgId: string
  computers: ComputerIdentity[]
}

export function computerStopObjectName(orgId: string): string {
  return `org-computer-stops:${orgId}`
}

/** The org task keeps physical identities after their original scope changes. */
export class ComputerStopTask {
  private readonly storage: WorkspaceStorage
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies

  constructor(
    storage: WorkspaceStorage,
    env: AppEnv,
    dependencies: AppDependencies,
  ) {
    this.storage = storage
    this.env = env
    this.dependencies = dependencies
  }

  async enqueue(
    orgId: string,
    computers: readonly ComputerIdentity[],
  ): Promise<ComputerIdentity[]> {
    await this.storage.transaction(async (transaction) => {
      const prior = await transaction.get(
        'computerStops',
        COMPUTER_STOP_TASK_KEY,
      )
      const pending = [
        ...new Map(
          [...(prior?.computers ?? []), ...computers].map((computer) => [
            computerIdentityKey(computer),
            computer,
          ]),
        ).values(),
      ]
      const existing = new Set(prior?.computers.map(computerIdentityKey))
      for (const computer of computers)
        if (!existing.has(computerIdentityKey(computer)))
          await transaction.delete(retryKey(computer))
      if (pending.length)
        await transaction.put('computerStops', COMPUTER_STOP_TASK_KEY, {
          orgId,
          computers: pending,
        })
      else await transaction.delete(COMPUTER_STOP_TASK_KEY)
      await this.schedule(transaction)
    })
    await this.advance()
    return (await this.read())?.computers ?? []
  }

  read(): Promise<ComputerStopTaskState | undefined> {
    return this.storage.get('computerStops', COMPUTER_STOP_TASK_KEY)
  }

  async advance(): Promise<void> {
    const work = await this.read()
    if (!work) return
    for (const computer of work.computers) {
      if (!(await liveOrgComputer(this.env.DB, work.orgId, computer))) {
        await this.confirm(computer)
        continue
      }
      const attempt = await this.storage.transaction(async (transaction) => {
        const previous = await transaction.get('retry', retryKey(computer))
        const ready = !previous || previous.at <= this.dependencies.now()
        const retry = ready
          ? nextBackgroundRetry(previous, this.dependencies.now())
          : previous
        if (ready) await transaction.put('retry', retryKey(computer), retry)
        await this.schedule(transaction)
        return { retry, ready }
      })
      if (!attempt.ready) continue
      const id = computer.sandboxId
      let confirmed: boolean
      try {
        const provider = providerForAccount(
          this.env,
          this.dependencies.fetch,
          computer.providerAccount,
        )
        const reply = await replyOrCurrentState(provider, id, () =>
          provider.stop(id),
        )
        confirmed = providerState(reply.state) === 'stopped'
      } catch (error) {
        confirmed = error instanceof ProviderError && error.kind === 'not_found'
        if (!confirmed)
          await this.storage.transaction(async (transaction) => {
            await transaction.put(
              'retry',
              retryKey(computer),
              failedBackgroundRetry(
                attempt.retry,
                error,
                this.dependencies.now(),
              ),
            )
            await this.schedule(transaction)
          })
      }
      if (confirmed) await this.confirm(computer)
    }
    await this.storage.transaction((transaction) => this.schedule(transaction))
  }

  private async schedule(transaction: WorkspaceTransaction): Promise<void> {
    const current = await transaction.get(
      'computerStops',
      COMPUTER_STOP_TASK_KEY,
    )
    if (!current?.computers.length) {
      await transaction.deleteAlarm()
      return
    }
    const retries = await Promise.all(
      current.computers.map((computer) =>
        transaction.get('retry', retryKey(computer)),
      ),
    )
    await transaction.setAlarm(
      Math.min(
        ...retries.map(
          (retry) => retry?.at ?? this.dependencies.now() + 30_000,
        ),
      ),
    )
  }

  private async confirm(computer: ComputerIdentity): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      const current = await transaction.get(
        'computerStops',
        COMPUTER_STOP_TASK_KEY,
      )
      if (!current) return
      await transaction.delete(retryKey(computer))
      const computers = current.computers.filter(
        (pending) =>
          computerIdentityKey(pending) !== computerIdentityKey(computer),
      )
      if (computers.length) {
        await transaction.put('computerStops', COMPUTER_STOP_TASK_KEY, {
          ...current,
          computers,
        })
      } else await transaction.delete(COMPUTER_STOP_TASK_KEY)
      await this.schedule(transaction)
    })
  }
}
