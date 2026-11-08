import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
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
import {
  durableStartStorage,
  readStartLog,
  START_JOB_KEY,
} from './start-storage'
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
import { WorkspaceAccessStop } from './workspace-suspension'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import type { WorkspacePlatform } from './workspace-platform'
import type { WorkspaceController } from './workspace-controller-types'
import {
  taskWorkspaceStorage,
  workspaceTaskAlarms,
} from './workspace-task-alarms'

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
  const alarms = workspaceTaskAlarms(platform.storage)
  const startStorage = taskWorkspaceStorage(platform.storage, 'lifecycle:start')
  const cleanupStorage = taskWorkspaceStorage(
    platform.storage,
    'lifecycle:cleanup',
  )
  const images = new ImageCoordinator(
    taskWorkspaceStorage(platform.storage, 'lifecycle:image'),
    env,
    dependencies,
  )
  const { lifecycle, projection } = createWorkspaceLifecycle(
    platform,
    env,
    dependencies,
    turns,
    journal,
  )
  const accessStop = new WorkspaceAccessStop(() => ({
    env,
    dependencies,
    storage: taskWorkspaceStorage(platform.storage, 'lifecycle:access'),
    lifecycle,
    starts,
    turns,
    alarms,
  }))
  const drafts: FailedCreationStorage = {
    get: (key) => platform.storage.get('draft', key),
    put: (key, value) => platform.storage.put('draft', key, value),
  }
  const controller: WorkspaceController = {
    extendLifecycleInput: (operation) => lifecycle.input.extend(operation),
    recordLifecycleInput: (at) => lifecycle.input.record(at),
    captureLifecycleActivity: () => lifecycle.input.capture(),
    reconcileLifecycleActivity: async (snapshot, remote) => {
      if (await lifecycle.input.reconcile(snapshot, remote)) await turns.clear()
    },
    cancelLifecycleWaiters: () => starts.abortWaiters(),
    cancelSuspendedLifecycleStart: (id, ownerId) =>
      accessStop.cancelPending(id, ownerId),
    projectDeviceState: (id, choice, now, publish) =>
      projection.deviceChanged(id, choice, now, publish),
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
      await initializeWorkspaceLifecycle(platform, env, lifecycle, input)
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
    async lifecycleActivity(checkOnly) {
      try {
        if (checkOnly) await lifecycle.input.check()
        else await lifecycle.activity()
        return { ok: true }
      } catch (error) {
        if (!(error instanceof HttpError && error.code === 'org_suspended'))
          throw error
        return {
          ok: false,
          error: { code: error.code, message: error.message },
        }
      }
    },
    async lifecycleStopped(): Promise<void> {
      await starts.cancel()
      await turns.clear()
      await lifecycle.stopped()
    },
    async suspendLifecycle(
      workspaceId: string,
      ownerUserId: string,
    ): Promise<boolean> {
      return (await accessStop.check(workspaceId, ownerUserId)) === true
    },
    reconcileLifecycleAccess(workspaceId: string): Promise<void> {
      return accessStop.ownerChanged(workspaceId)
    },
    async clearLifecycle(): Promise<void> {
      const state = await lifecycle.read()
      if (state) await platform.stopped?.(state.workspaceId)
      await turns.clear()
      await lifecycle.clear(
        Boolean(await platform.storage.get('job', 'lifecycle:start-job')),
      )
      await alarms.set('lifecycle:access', null)
      await journal.clearFailedCreate()
    },
    async acknowledgeLifecycleFirstMessage(publish): Promise<void> {
      await lifecycle.acknowledgeFirstMessage(publish)
    },
    recoverLifecycle: (publish) => lifecycle.recoverTurns(publish),
    async registerLifecycleTurn(turn, publish): Promise<void> {
      await registerTrustedTurn(env, lifecycle, turns, turn, publish)
    },
    async finishLifecycleTurn(turnId, publish): Promise<void> {
      const turn = await turns.remove(turnId)
      if (turn) await lifecycle.turn(turn.sessionId, false, publish)
    },
    async credentialSender(turnId: string): Promise<string | null> {
      const state = await lifecycle.read()
      if (!state || state.state === 'stopped' || state.state === 'archived')
        return null
      await requireWorkspaceOrg(env.DB, state.orgId, state.workspaceId)
      const job = await platform.storage.get('job', START_JOB_KEY)
      return job?.kind === 'create' &&
        (job.phase === 'fetch' || job.phase === 'branch') &&
        !job.cancelled &&
        !job.failure &&
        job.turnId === turnId
        ? job.admission.first.sender.id
        : null
    },
    async reportRunnerLifecycle(event, publish): Promise<void> {
      const apply = () => applyRunnerLifecycle(lifecycle, turns, event, publish)
      if (event.type === 'runner.ready') await starts.reportRunnerReady(apply)
      else await apply()
    },
    async runnerLifecycleDisconnected(publish): Promise<void> {
      await lifecycle.runnerDisconnected(publish)
    },
    async scheduleImage(state: ImageCoordinatorState): Promise<void> {
      await images.schedule(state)
    },
    async retryFailedCreateCleanup(workspaceId: string): Promise<void> {
      await cleanupStorage.transaction(async (storage) => {
        await storage.put('text', 'lifecycle:cleanup', workspaceId)
        await storage.setAlarm(dependencies.now() + 5_000)
      })
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
        accessStop,
        alarms,
        startStorage,
        cleanupStorage,
      })
    },
  }
  const starts: WorkspaceStartCoordinator = new WorkspaceStartCoordinator(
    env,
    dependencies,
    controller,
    durableStartStorage(startStorage, dependencies.now, env),
    async (error, cancelled) => {
      await turns.clear()
      await lifecycle.stopFailedStart(error, cancelled)
    },
  )
  return controller
}
