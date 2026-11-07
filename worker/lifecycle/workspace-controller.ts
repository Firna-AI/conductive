import type { AppDependencies, AppEnv } from '../env'
import type { RunnerEvent } from '../../src/shared/runner'
import type { StartStep, WorkspaceStart } from '../../src/shared/workspaces'
import { requireWorkspaceOrg } from './access'
import { runWorkspaceAlarm } from './workspace-alarm'
import { WorkspaceEventJournal } from './durable-journal'
import type { DurableLifecycleState } from './durable-types'
import { ImageCoordinator } from './image-coordinator'
import type { ImageCoordinatorState } from './image-timers'
import { TurnScopes } from './turns'
import { applyRunnerLifecycle, registerTrustedTurn } from './runner-lifecycle'
import { WorkspaceStartCoordinator } from './start-coordinator'
import type { WorkspaceStartJob } from './start-types'
import { durableStartStorage, readStartLog } from './start-storage'
import {
  retainFailedCreation,
  failedCreationForSender,
  type FailedCreationDraft,
  type FailedCreationStorage,
} from './failed-creations'
import { workspaceActionContext } from './workspace-actions'
import { initializeWorkspaceLifecycle } from './lifecycle-admission'
import { createWorkspaceLifecycle } from './create-workspace-lifecycle'
import { finishDiskMaintenance } from './disk-retention'
import { clearRetention } from './retention-data'
import type {
  PendingTurn,
  WorkspaceLifecycleEndpoint,
} from './workspace-runtime'
import type { WorkspacePlatform } from './workspace-platform'
import type { WorkspaceController } from './workspace-controller-types'

export function createWorkspaceController(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: AppDependencies,
  platform: WorkspacePlatform,
): WorkspaceController {
  const turns = new TurnScopes({
    read: async () =>
      (await platform.storage.get('turns', 'lifecycle:turn-scopes')) ?? [],
    write: (values) =>
      platform.storage.put('turns', 'lifecycle:turn-scopes', values),
  })
  const journal = new WorkspaceEventJournal(platform.storage, platform.publish)
  const images = new ImageCoordinator(platform.storage, env, dependencies)
  const lifecycle = createWorkspaceLifecycle(
    platform,
    env,
    dependencies,
    turns,
    journal,
  )
  const drafts: FailedCreationStorage = {
    get: (key) => platform.storage.get('draft', key),
    put: (key, value) => platform.storage.put('draft', key, value),
  }
  const controller: WorkspaceController = {
    async queueLifecycleStart(job: WorkspaceStartJob): Promise<boolean> {
      const enqueued = starts.enqueue(job)
      platform.waitUntil(enqueued)
      return enqueued
    },
    waitLifecycleStart() {
      return starts.wait()
    },
    waitCreationLifecycle() {
      return starts.waitCreation()
    },
    waitCreationAdmission() {
      return starts.waitAdmission()
    },
    readCreationLifecycleResult() {
      return starts.creationResult()
    },
    readLifecycleStartLog() {
      return readStartLog(platform.storage, env)
    },
    async retainLifecycleFailedCreation(
      error: FailedCreationDraft['error'],
      fallback?: Omit<FailedCreationDraft, 'error'>,
    ): Promise<void> {
      await retainFailedCreation(
        env,
        drafts,
        await lifecycle.read(),
        error,
        fallback,
      )
    },
    async failedLifecycleCreation(
      orgId: string,
      senderUserId: string,
    ): Promise<FailedCreationDraft | undefined> {
      return failedCreationForSender(env, drafts, orgId, senderUserId)
    },
    async initializeLifecycle(
      input: Parameters<WorkspaceLifecycleEndpoint['initializeLifecycle']>[0],
    ): Promise<void> {
      await initializeWorkspaceLifecycle(platform, env, lifecycle, turns, input)
    },
    readLifecycle() {
      return lifecycle.read()
    },
    async beginLifecycleStart(kind: WorkspaceStart['kind']) {
      if ((await platform.storage.get('job', 'lifecycle:start-job'))?.cancelled)
        return
      await lifecycle.beginStart(kind)
      const state = await lifecycle.read()
      if (state) await clearRetention(env.DB, state.workspaceId)
    },
    lifecycleStep(id: string, label: string, state: StartStep['state']) {
      return lifecycle.step(id, label, state)
    },
    async lifecyclePrepared() {
      if ((await lifecycle.read())?.runnerConnected)
        await lifecycle.step('runner', 'Starting the agent', 'completed')
      await lifecycle.prepared()
    },
    lifecycleFailed(error: NonNullable<DurableLifecycleState['error']>) {
      return lifecycle.fail(error)
    },
    lifecycleActivity() {
      return lifecycle.activity()
    },
    async openLifecycleTab(tabId: string) {
      lifecycle.openTab(tabId)
    },
    async closeLifecycleTab(tabId: string) {
      lifecycle.closeTab(tabId)
    },
    async lifecycleStopped(): Promise<void> {
      await starts.cancel()
      await turns.clear()
      await lifecycle.stopped()
    },
    async clearLifecycle(): Promise<void> {
      await turns.clear()
      await lifecycle.clear(
        Boolean(await platform.storage.get('job', 'lifecycle:start-job')),
      )
      await journal.clearFailedCreate()
    },
    async acknowledgeLifecycleFirstMessage(): Promise<void> {
      await lifecycle.acknowledgeFirstMessage()
    },
    async registerLifecycleTurn(turn: PendingTurn): Promise<void> {
      await registerTrustedTurn(env, lifecycle, turns, turn)
    },
    async finishLifecycleTurn(turnId: string): Promise<void> {
      const turn = await turns.remove(turnId)
      if (turn) await lifecycle.turn(turn.sessionId, false)
    },
    async credentialSender(turnId: string): Promise<string | null> {
      const state = await lifecycle.read()
      if (!state || state.state === 'stopped' || state.state === 'archived')
        return null
      await requireWorkspaceOrg(env.DB, state.orgId, state.workspaceId)
      return turns.sender(turnId)
    },
    async reportRunnerLifecycle(event: RunnerEvent): Promise<void> {
      await applyRunnerLifecycle(lifecycle, turns, event)
    },
    async runnerLifecycleDisconnected(): Promise<void> {
      await lifecycle.runnerDisconnected()
    },
    async scheduleImage(state: ImageCoordinatorState): Promise<void> {
      await images.schedule(state)
    },
    async retryFailedCreateCleanup(workspaceId: string): Promise<void> {
      await platform.storage.put('text', 'lifecycle:cleanup', workspaceId)
      await platform.storage.setAlarm(dependencies.now() + 5_000)
    },
    async finishDiskMaintenance(): Promise<void> {
      await finishDiskMaintenance(
        await workspaceActionContext(env, dependencies, lifecycle),
        lifecycle,
      )
    },
    async alarm(): Promise<void> {
      await runWorkspaceAlarm({
        storage: platform.storage,
        env: env,
        dependencies: dependencies,
        images: images,
        starts: starts,
        lifecycle: lifecycle,
      })
    },
  }
  const starts: WorkspaceStartCoordinator = new WorkspaceStartCoordinator(
    env,
    dependencies,
    controller,
    durableStartStorage(platform.storage, dependencies.now, env),
  )
  return controller
}
