import type { WorkspaceEventEnvelope } from './workspace-events'
import { SessionLogins } from './session-login'
import type { ChatStore, ChatTransaction } from './store'
import type { ChatDependencies } from './types'

/** The caller holds the serial queue. Each change commits independently. */
export class ChatOperation {
  readonly logins: SessionLogins
  readonly workspaceId: string
  private readonly store: ChatStore
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    workspaceId: string,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.store = store
    this.workspaceId = workspaceId
    this.publish = publish
    this.logins = new SessionLogins(this, dependencies)
  }

  read<T>(work: (view: ChatTransaction) => Promise<T>): Promise<T> {
    return this.store.read(this.workspaceId, work)
  }

  change<T>(work: (transaction: ChatTransaction) => Promise<T>): Promise<T> {
    return this.store.change(this.workspaceId, work, this.publish)
  }
}
