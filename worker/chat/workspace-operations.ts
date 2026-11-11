import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import type { AppEnv } from '../env'
import type { FirstWorkspaceMessage } from '../lifecycle/workspace-runtime'
import {
  admitFirstMessage,
  firstMessageIdentity,
  requireFirstMessage,
} from './first-message'
import type { ChatStore } from './store'
import type { ChatDependencies } from './types'
import { stopDispatchedTurns } from './workspace-stop'

interface WorkspaceOperationOptions {
  env: AppEnv
  store: ChatStore
  dependencies: ChatDependencies
  workspaceId(): string | null
  bind(id: string): void
  publish(events: readonly WorkspaceEventEnvelope[]): void
  closeRunner(): void
}

export class WorkspaceOperations {
  private readonly options: WorkspaceOperationOptions
  constructor(options: WorkspaceOperationOptions) {
    this.options = options
  }

  summary(workspaceId?: string) {
    const { store, bind, publish } = this.options
    return store.run(async () => {
      const id =
        workspaceId ?? this.options.workspaceId() ?? (await store.workspaceId())
      if (!id)
        return {
          throughEventNumber: 0,
          lastOutputEventNumber: 0,
          working: false,
        }
      bind(id)
      return store.change(id, (view) => view.workspaceSummary(), publish)
    })
  }

  async accept(first: FirstWorkspaceMessage) {
    const { env, store, bind, publish, dependencies } = this.options
    bind(first.workspaceId)
    const identity = await firstMessageIdentity(env, first.workspaceId)
    const sender = requireFirstMessage(identity, first)
    return store.change(
      first.workspaceId,
      async (transaction) => {
        const message = await admitFirstMessage(
          transaction,
          first,
          sender,
          dependencies,
          identity?.archivedAt !== null,
        )
        await transaction.saveFirstMessageAdmission(first)
        return message
      },
      publish,
    )
  }

  async stop(workspaceId: string): Promise<void> {
    const { store, bind, publish, closeRunner } = this.options
    bind(workspaceId)
    closeRunner()
    await store.change(
      workspaceId,
      async (transaction) => {
        await transaction.emit({ type: 'ports.updated', ports: null })
        await stopDispatchedTurns(transaction)
      },
      publish,
    )
  }

  async commit(
    workspaceId: string,
    event: WorkspaceEvent,
    occurredAt?: number,
  ): Promise<void> {
    const { store, bind, publish } = this.options
    bind(workspaceId)
    await store.change(
      workspaceId,
      (transaction) => transaction.emit(event, occurredAt),
      publish,
    )
  }

  async revokePreviews(
    workspaceId: string,
    previewIds: readonly string[],
  ): Promise<void> {
    const { store, bind, publish } = this.options
    bind(workspaceId)
    await store.change(
      workspaceId,
      async (transaction) => {
        for (const id of previewIds) await transaction.previews.revoke(id)
      },
      publish,
    )
  }
}
