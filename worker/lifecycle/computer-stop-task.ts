import type { AppDependencies, AppEnv } from '../env'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import {
  computerIdentityKey,
  liveOrgComputer,
  type ComputerIdentity,
} from './computer-ledger'
import type { WorkspaceStorage } from './platform-storage'
import { providerState } from './provider-state'
import { replyOrCurrentState } from './workspace-actions'

export const COMPUTER_STOP_TASK_KEY = 'lifecycle:computer-stops'

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
      await transaction.put('computerStops', COMPUTER_STOP_TASK_KEY, {
        orgId,
        computers: [
          ...new Map(
            [...(prior?.computers ?? []), ...computers].map((computer) => [
              computerIdentityKey(computer),
              computer,
            ]),
          ).values(),
        ],
      })
      await transaction.setAlarm(this.dependencies.now() + 30_000)
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
    await this.storage.setAlarm(this.dependencies.now() + 30_000)
    for (const computer of work.computers) {
      const id = computer.sandboxId
      let confirmed: boolean
      try {
        if (!(await liveOrgComputer(this.env.DB, work.orgId, computer)))
          confirmed = true
        else {
          const provider = providerForAccount(
            this.env,
            this.dependencies.fetch,
            computer.providerAccount,
          )
          const reply = await replyOrCurrentState(provider, id, () =>
            provider.stop(id),
          )
          confirmed = providerState(reply.state) === 'stopped'
        }
      } catch (error) {
        confirmed = error instanceof ProviderError && error.kind === 'not_found'
      }
      if (confirmed) await this.confirm(computer)
    }
  }

  private async confirm(computer: ComputerIdentity): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      const current = await transaction.get(
        'computerStops',
        COMPUTER_STOP_TASK_KEY,
      )
      if (!current) return
      const computers = current.computers.filter(
        (pending) =>
          computerIdentityKey(pending) !== computerIdentityKey(computer),
      )
      if (computers.length) {
        await transaction.put('computerStops', COMPUTER_STOP_TASK_KEY, {
          ...current,
          computers,
        })
      } else {
        await transaction.delete(COMPUTER_STOP_TASK_KEY)
        await transaction.deleteAlarm()
      }
    })
  }
}
