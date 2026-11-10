import type { AppDependencies, AppEnv } from '../env'
import { sandboxProvider } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { liveOrgComputer } from './computer-ledger'
import type { WorkspaceStorage } from './platform-storage'
import { providerState } from './provider-state'
import { replyOrCurrentState } from './workspace-actions'

export const COMPUTER_STOP_TASK_KEY = 'lifecycle:computer-stops'

export interface ComputerStopTaskState {
  orgId: string
  sandboxIds: string[]
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
    sandboxIds: readonly string[],
  ): Promise<string[]> {
    await this.storage.transaction(async (transaction) => {
      const prior = await transaction.get(
        'computerStops',
        COMPUTER_STOP_TASK_KEY,
      )
      await transaction.put('computerStops', COMPUTER_STOP_TASK_KEY, {
        orgId,
        sandboxIds: [...new Set([...(prior?.sandboxIds ?? []), ...sandboxIds])],
      })
      await transaction.setAlarm(this.dependencies.now() + 30_000)
    })
    await this.advance()
    return (await this.read())?.sandboxIds ?? []
  }

  read(): Promise<ComputerStopTaskState | undefined> {
    return this.storage.get('computerStops', COMPUTER_STOP_TASK_KEY)
  }

  async advance(): Promise<void> {
    const work = await this.read()
    if (!work) return
    await this.storage.setAlarm(this.dependencies.now() + 30_000)
    const provider = sandboxProvider(this.env, this.dependencies.fetch)
    for (const id of work.sandboxIds) {
      let confirmed: boolean
      try {
        if (!(await liveOrgComputer(this.env.DB, work.orgId, id)))
          confirmed = true
        else {
          const reply = await replyOrCurrentState(provider, id, () =>
            provider.stop(id),
          )
          confirmed = providerState(reply.state) === 'stopped'
        }
      } catch (error) {
        confirmed = error instanceof ProviderError && error.kind === 'not_found'
      }
      if (confirmed) await this.confirm(id)
    }
  }

  private async confirm(id: string): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      const current = await transaction.get(
        'computerStops',
        COMPUTER_STOP_TASK_KEY,
      )
      if (!current) return
      const sandboxIds = current.sandboxIds.filter((pending) => pending !== id)
      if (sandboxIds.length) {
        await transaction.put('computerStops', COMPUTER_STOP_TASK_KEY, {
          ...current,
          sandboxIds,
        })
      } else {
        await transaction.delete(COMPUTER_STOP_TASK_KEY)
        await transaction.deleteAlarm()
      }
    })
  }
}
