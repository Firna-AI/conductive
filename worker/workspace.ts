import { DurableObject } from 'cloudflare:workers'

import type { RunnerEvent } from '../src/shared/runner'
import type { StartStep, WorkspaceStart } from '../src/shared/workspaces'
import { requireWorkspaceOrg } from './lifecycle/access'
import { runWorkspaceAlarm } from './lifecycle/workspace-alarm'
import type { DurableLifecycle } from './lifecycle/durable'
import { WorkspaceEventJournal } from './lifecycle/durable-journal'
import type { DurableLifecycleState } from './lifecycle/durable-types'
import { ImageCoordinator } from './lifecycle/image-coordinator'
import type { ImageCoordinatorState } from './lifecycle/image-timers'
import {
  lifecycleDependencies,
  type LifecycleEnvironment,
} from './lifecycle/runtime'
import { TurnScopes } from './lifecycle/turns'
import {
  applyRunnerLifecycle,
  registerTrustedTurn,
} from './lifecycle/runner-lifecycle'
import { WorkspaceStartCoordinator } from './lifecycle/start-coordinator'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import { durableStartStorage, readStartLog } from './lifecycle/start-storage'
import {
  retainFailedCreation,
  failedCreationForSender,
  type FailedCreationDraft,
} from './lifecycle/failed-creations'
import { workspaceActionContext } from './lifecycle/workspace-actions'
import { initializeWorkspaceLifecycle } from './lifecycle/lifecycle-admission'
import { createWorkspaceLifecycle } from './lifecycle/create-workspace-lifecycle'
import { finishDiskMaintenance } from './lifecycle/disk-retention'
import { clearRetention } from './lifecycle/retention-data'

import type {
  PendingTurn,
  WorkspaceLifecycleEndpoint,
} from './lifecycle/workspace-runtime'
import {
  broadcastWorkspaceEvent,
  handleWorkspaceSocket,
} from './lifecycle/workspace-sockets'

export class Workspace
  extends DurableObject<LifecycleEnvironment>
  implements WorkspaceLifecycleEndpoint
{
  private readonly dependencies = lifecycleDependencies()
  private readonly turns = new TurnScopes({
    read: async () =>
      (await this.ctx.storage.get<PendingTurn[]>('lifecycle:turn-scopes')) ??
      [],
    write: async (turns) => {
      await this.ctx.storage.put('lifecycle:turn-scopes', turns)
    },
  })
  private readonly journal = new WorkspaceEventJournal(
    this.ctx.storage,
    (notice) => broadcastWorkspaceEvent(this.env, this.ctx, notice),
  )
  private readonly images = new ImageCoordinator(
    this.ctx.storage,
    this.env,
    this.dependencies,
  )
  private readonly lifecycle: DurableLifecycle = createWorkspaceLifecycle(
    this.ctx,
    this.env,
    this.dependencies,
    this.turns,
    this.journal,
  )
  private readonly starts: WorkspaceStartCoordinator =
    new WorkspaceStartCoordinator(
      this.env,
      this.dependencies,
      this,
      durableStartStorage(this.ctx.storage, this.dependencies.now, this.env),
    )

  async queueLifecycleStart(job: WorkspaceStartJob): Promise<boolean> {
    const enqueued = this.starts.enqueue(job)
    this.ctx.waitUntil(enqueued)
    return enqueued
  }
  waitLifecycleStart() {
    return this.starts.wait()
  }
  readLifecycleStartLog() {
    return readStartLog(this.ctx.storage, this.env)
  }

  async retainLifecycleFailedCreation(
    error: FailedCreationDraft['error'],
    fallback?: Omit<FailedCreationDraft, 'error'>,
  ): Promise<void> {
    await retainFailedCreation(
      this.env,
      this.ctx.storage,
      await this.lifecycle.read(),
      error,
      fallback,
    )
  }
  async failedLifecycleCreation(
    orgId: string,
    senderUserId: string,
  ): Promise<FailedCreationDraft | undefined> {
    return failedCreationForSender(
      this.env,
      this.ctx.storage,
      orgId,
      senderUserId,
    )
  }

  async initializeLifecycle(
    input: Parameters<WorkspaceLifecycleEndpoint['initializeLifecycle']>[0],
  ): Promise<void> {
    await initializeWorkspaceLifecycle(
      this.ctx,
      this.env,
      this.lifecycle,
      this.turns,
      input,
    )
  }

  readLifecycle() {
    return this.lifecycle.read()
  }
  async beginLifecycleStart(kind: WorkspaceStart['kind']) {
    if (
      (await this.ctx.storage.get<WorkspaceStartJob>('lifecycle:start-job'))
        ?.cancelled
    )
      return
    await this.lifecycle.beginStart(kind)
    const state = await this.lifecycle.read()
    if (state) await clearRetention(this.env.DB, state.workspaceId)
  }
  lifecycleStep(id: string, label: string, state: StartStep['state']) {
    return this.lifecycle.step(id, label, state)
  }
  async lifecyclePrepared() {
    if ((await this.lifecycle.read())?.runnerConnected)
      await this.lifecycle.step('runner', 'Starting the agent', 'completed')
    await this.lifecycle.prepared()
  }
  lifecycleFailed(error: NonNullable<DurableLifecycleState['error']>) {
    return this.lifecycle.fail(error)
  }
  lifecycleActivity() {
    return this.lifecycle.activity()
  }
  async openLifecycleTab(tabId: string) {
    this.lifecycle.openTab(tabId)
  }
  async closeLifecycleTab(tabId: string) {
    this.lifecycle.closeTab(tabId)
  }

  async lifecycleStopped(): Promise<void> {
    await this.starts.cancel()
    await this.turns.clear()
    await this.lifecycle.stopped()
  }

  async clearLifecycle(): Promise<void> {
    await this.turns.clear()
    await this.lifecycle.clear(
      Boolean(await this.ctx.storage.get('lifecycle:start-job')),
    )
    await this.journal.clearFailedCreate()
  }

  async acknowledgeLifecycleFirstMessage(): Promise<void> {
    await this.lifecycle.acknowledgeFirstMessage()
  }

  /** Chat dispatch calls this before it sends a turn and its runtime env. */
  async registerLifecycleTurn(turn: PendingTurn): Promise<void> {
    await registerTrustedTurn(this.env, this.lifecycle, this.turns, turn)
  }

  async finishLifecycleTurn(turnId: string): Promise<void> {
    const turn = await this.turns.remove(turnId)
    if (turn) await this.lifecycle.turn(turn.sessionId, false)
  }

  async credentialSender(turnId: string): Promise<string | null> {
    const state = await this.lifecycle.read()
    if (!state || state.state === 'stopped' || state.state === 'archived')
      return null
    await requireWorkspaceOrg(this.env.DB, state.orgId, state.workspaceId)
    return this.turns.sender(turnId)
  }

  /** Ordered runner ingestion calls this after it accepts each lifecycle report. */
  async reportRunnerLifecycle(event: RunnerEvent): Promise<void> {
    await applyRunnerLifecycle(this.lifecycle, this.turns, event)
  }

  async runnerLifecycleDisconnected(): Promise<void> {
    await this.lifecycle.runnerDisconnected()
  }

  async scheduleImage(state: ImageCoordinatorState): Promise<void> {
    await this.images.schedule(state)
  }

  async retryFailedCreateCleanup(workspaceId: string): Promise<void> {
    await this.ctx.storage.put('lifecycle:cleanup', workspaceId)
    await this.ctx.storage.setAlarm(this.dependencies.now() + 5_000)
  }

  async finishDiskMaintenance(): Promise<void> {
    await finishDiskMaintenance(await this.actionContext(), this.lifecycle)
  }

  async alarm(): Promise<void> {
    await runWorkspaceAlarm({
      storage: this.ctx.storage,
      env: this.env,
      dependencies: this.dependencies,
      images: this.images,
      starts: this.starts,
      lifecycle: this.lifecycle,
    })
  }

  async fetch(request: Request): Promise<Response> {
    return handleWorkspaceSocket(
      request,
      this.env,
      this.ctx,
      this.lifecycle,
      this.journal,
    )
  }

  async webSocketMessage(): Promise<void> {}

  async webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    socket.close(code, reason)
  }

  private actionContext() {
    return workspaceActionContext(this.env, this.dependencies, this.lifecycle)
  }
}
