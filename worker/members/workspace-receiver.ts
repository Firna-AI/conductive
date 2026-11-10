import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceFeatures } from '../features/workspace'
import type { DurableLifecycleState } from '../lifecycle/durable-types'
import type { ImageCoordinatorState } from '../lifecycle/image-timers'
import type { WorkspaceDisk } from './maintenance-contract'
import type { StoredWorkspaceStartJob } from '../lifecycle/start-job-codec'
import { CREATE_CHECKPOINT_KEY } from './creation-checkpoint'
import { scheduleWorkspaceAlarm } from '../features/alarms'
import type { LifecycleOwnership } from './lifecycle-contract'
import {
  LIFECYCLE_FENCE_KEY,
  mutateReceiver,
  purgeReceiverPayload,
  type ReceiverFence,
} from './receiver-fence'

export type ReceiverOwnership = Pick<LifecycleOwnership, 'orgId' | 'generation'>

export class WorkspaceMembersReceiver {
  private readonly storage: DurableObjectStorage
  private readonly chat: WorkspaceChat
  private readonly features: WorkspaceFeatures
  private readonly now: () => number
  constructor(
    storage: DurableObjectStorage,
    chat: WorkspaceChat,
    features: WorkspaceFeatures,
    now: () => number = Date.now,
  ) {
    this.storage = storage
    this.chat = chat
    this.features = features
    this.now = now
  }

  async active(): Promise<boolean> {
    const fence = await this.readFence()
    return !fence || fence.mode === 'active'
  }

  readFence(): Promise<ReceiverFence | undefined> {
    return this.storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
  }

  async suspend(
    ownership: ReceiverOwnership,
    workspaceId: string | null,
  ): Promise<void> {
    await mutateReceiver(
      this.storage,
      ownership,
      'suspended',
      async (transaction) => {
        await transaction.deleteAlarm()
      },
    )
    this.chat.closeConnections()
    await this.chat.runLifecycle(async () => {
      if (workspaceId) {
        await this.features.revokeWorkspace(workspaceId, true)
        await this.chat.stopWorkspace(workspaceId)
      }
    })
    await mutateReceiver(
      this.storage,
      ownership,
      'suspended',
      async (transaction) => {
        await transaction.delete([
          ...(await transaction.list({ prefix: 'alarm:' })).keys(),
        ])
        const job = await transaction.get<StoredWorkspaceStartJob>(
          'lifecycle:start-job',
        )
        if (job?.kind === 'create')
          await transaction.put(CREATE_CHECKPOINT_KEY, job)
        await transaction.delete('lifecycle:start-job')
        await transaction.delete('lifecycle:create-publication')
        await transaction.delete('lifecycle:turn-scopes')
        const state =
          await transaction.get<DurableLifecycleState>('lifecycle:state')
        if (!state && workspaceId && job?.kind === 'create') {
          await transaction.put('lifecycle:state', {
            workspaceId,
            orgId: ownership.orgId,
            state: 'stopped',
            start: null,
            pendingFirstMessage: job.creation?.request ?? null,
            lastActivityAt: 0,
            runningSessions: [],
            runnerConnected: false,
            stoppedAt: null,
            nextDiskKeepaliveAt: null,
            error: null,
          } satisfies DurableLifecycleState)
        } else if (state)
          await transaction.put('lifecycle:state', {
            ...state,
            state: state.state === 'archived' ? 'archived' : 'stopped',
            start: null,
            runningSessions: [],
            runnerConnected: false,
            nextDiskKeepaliveAt: null,
          } satisfies DurableLifecycleState)
        await transaction.deleteAlarm()
      },
    )
  }

  async restore(
    ownership: ReceiverOwnership,
    disk: WorkspaceDisk | null,
    image: ImageCoordinatorState | null,
  ): Promise<void> {
    await mutateReceiver(
      this.storage,
      ownership,
      'suspended',
      async () => undefined,
    )
    await this.chat.runLifecycle(async () => undefined)
    await mutateReceiver(
      this.storage,
      ownership,
      'active',
      async (transaction) => {
        if (disk) {
          const stored =
            await transaction.get<DurableLifecycleState>('lifecycle:state')
          await transaction.put('lifecycle:state', {
            workspaceId: disk.workspaceId,
            orgId: ownership.orgId,
            state: 'stopped',
            start: null,
            pendingFirstMessage: null,
            lastActivityAt: disk.stoppedAt,
            runningSessions: [],
            runnerConnected: false,
            error: null,
            ...stored,
            stoppedAt: disk.stoppedAt,
            nextDiskKeepaliveAt: disk.nextKeepaliveAt,
          } satisfies DurableLifecycleState)
          if (disk.nextKeepaliveAt !== null)
            await transaction.put('alarm:lifecycle', disk.nextKeepaliveAt)
        }
        if (image) {
          await transaction.put('org-image:coordinator', image)
          await transaction.put('alarm:lifecycle', image.nextAt)
        }
        if (await transaction.get<string>('lifecycle:cleanup'))
          await transaction.put('alarm:lifecycle', this.now() + 5_000)
        await scheduleWorkspaceAlarm(transaction, { resumeRegular: true })
      },
    )
  }

  async remove(ownership: ReceiverOwnership): Promise<void> {
    await mutateReceiver(
      this.storage,
      ownership,
      'purged',
      async () => undefined,
    )
    this.chat.closeConnections()
    await this.chat.runLifecycle(async () => {
      await purgeReceiverPayload(this.storage, ownership)
    })
  }
}
