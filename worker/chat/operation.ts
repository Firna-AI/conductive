import type { User } from '../../src/shared/api'
import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import type { MergeQueueBranchLabel } from '../../src/shared/generated/MergeQueueBranchLabel'
import type { QueueFixRequest } from '../merge-queue/fix-contracts'
import type { WorkspaceEventEnvelope } from './workspace-events'
import { acceptQueueFix } from './queue-fix'
import { SessionLogins } from './session-login'
import type { ChatStore, ChatTransaction } from './store'
import type { ChatDependencies } from './types'

/** The caller holds the serial queue. Each change commits independently. */
export class ChatOperation {
  readonly logins: SessionLogins
  readonly workspaceId: string
  private readonly store: ChatStore
  private readonly dependencies: ChatDependencies
  private readonly publish: (events: readonly WorkspaceEventEnvelope[]) => void

  constructor(
    store: ChatStore,
    workspaceId: string,
    dependencies: ChatDependencies,
    publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  ) {
    this.store = store
    this.dependencies = dependencies
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

  acceptQueueFix(
    fix: QueueFixRequest,
    authorize: () => Promise<User>,
    baseLabel: () => Promise<MergeQueueBranchLabel>,
    defaultChoice: (userId: string) => Promise<AgentChoice>,
  ) {
    return acceptQueueFix(
      this,
      fix,
      authorize,
      baseLabel,
      defaultChoice,
      this.dependencies,
    )
  }
}
