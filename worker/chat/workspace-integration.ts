import { HttpError } from '../http'
import { pendingContinue } from '../lifecycle/continue-types'
import { WorkspaceFiles } from '../files/workspace'
import { durableFilesStorage } from '../files/storage'
import { WorkspaceAlarms, nativeAlarmStorage } from '../features/alarms'
import { nativeWorkspaceStorage } from '../lifecycle/platform-storage'
import {
  assertReceiverActive,
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import { receiverStorage } from '../members/receiver-storage'
import { DeviceRuntime } from '../devices/runtime'
import { createWorkspaceController } from '../lifecycle/workspace-controller'
import { nativeWorkspacePlatform } from '../lifecycle/workspace-platform'
import {
  lifecycleDependencies,
  type LifecycleEnvironment,
} from '../lifecycle/runtime'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import { WorkspaceChat } from './backend'
import { firstMessageIdentity } from './first-message'
import { projectWorkspaceTitle } from './workspace-title'
import type { ChatDependencies } from './types'
import { WorkspaceSockets } from '../native-sockets'
import {
  callbackPublisher,
  observeWorkspaceCallbacks,
  type WorkspaceCallbackObservers,
} from './workspace-callbacks'
import { QueueGenerations } from './queue-generation'

export type WorkspaceCompositionEnv = LifecycleEnvironment
export type WorkspaceChatResolvers = Partial<
  Pick<
    ChatDependencies,
    | 'resolveAttachments'
    | 'prepareAttachments'
    | 'scheduleRunnerCheck'
    | 'scheduleBrowserCheck'
    | 'randomId'
    | 'runTitleModel'
    | 'readConnectionAccess'
    | 'readRunnerAccess'
    | 'browserOpened'
    | 'browserClosed'
  >
> & {
  callbackObservers?: WorkspaceCallbackObservers
  socketAutoResponseAt?: (socket: WebSocket) => number | null
}

export function createWorkspaceIntegration(
  context: DurableObjectState,
  env: WorkspaceCompositionEnv,
  now: () => number,
  resolvers: WorkspaceChatResolvers = {},
) {
  const storage = receiverStorage(context.storage)
  const generations = new QueueGenerations(
    () => chat.store.currentTurn,
    async () =>
      (await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY))?.generation ?? 0,
  )
  const original = lifecycleDependencies()
  const dependencies = {
    ...original,
    now,
    fetch: async (request: Request) => {
      await assertReceiverActive(storage, generations.current())
      const response = await original.fetch(request)
      // An allocated resource must retain its returned ID before a suspension drains the phase.
      if (!(
        request.method === 'POST' &&
        new URL(request.url).pathname === '/api/v1/sandboxes'
      ))
        await assertReceiverActive(storage, generations.current())
      return response
    },
  }
  const alarms = new WorkspaceAlarms(
    nativeAlarmStorage(storage),
    nativeAlarmStorage(context.storage),
  )
  const sockets = new WorkspaceSockets(context)
  const stoppedHooks: ((id: string) => Promise<void>)[] = []
  const files = new WorkspaceFiles(
    durableFilesStorage(storage),
    dependencies.randomToken,
  )
  const matches = (name: string) =>
    env.WORKSPACES.idFromName(name).equals(context.id)
  const chat: WorkspaceChat = new WorkspaceChat(
    storage,
    env,
    {
      ...resolvers,
      now,
      matchesObject: matches,
      waitUntil: (promise) => context.waitUntil(promise),
      browserAlarm: (at) => alarms.set('browser', at),
      runnerAlarm: (at) => alarms.set('runner', at),
      runnerAttached: (_workspaceId, connectionId, send) => {
        files.runner.attach(connectionId, (command) => {
          context.waitUntil(
            send(command).then(
              (sent) => {
                if (!sent) files.runner.detach(connectionId)
              },
              () => files.runner.detach(connectionId),
            ),
          )
        })
      },
      runnerDetached: (connectionId) => files.runner.detach(connectionId),
      runnerHello: async (_id, publish) =>
        controller.recoverLifecycle(callbackPublisher(publish)),
      ...observeWorkspaceCallbacks(
        {
          turnEnded: async (_id, turnId, publish) => {
            try {
              const fence =
                await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
              if (fence && fence.mode !== 'active') return
              await controller.finishLifecycleTurn(
                turnId,
                callbackPublisher(publish),
              )
            } finally {
              context.waitUntil(devices.reconcile())
            }
          },
          receiveFileResult: async (value, connectionId) => {
            files.runner.receive(connectionId, value)
          },
          runnerReady: async (_id, publish) => {
            await controller.reportRunnerLifecycle(
              { type: 'runner.ready' },
              callbackPublisher(publish),
            )
            await controller.acknowledgeLifecycleFirstMessage(
              callbackPublisher(publish),
            )
          },
          runnerDisconnected: async (_id, publish) =>
            controller.runnerLifecycleDisconnected(callbackPublisher(publish)),
          turnDispatching: async (_id, turn, publish) => {
            if (await pendingContinue(storage)) return false
            const state = await controller.readLifecycle()
            if (!state) return true
            if (!['ready', 'working', 'unread', 'input'].includes(state.state))
              return false
            await controller.registerLifecycleTurn(
              turn,
              callbackPublisher(publish),
            )
            const registered = await controller.readLifecycle()
            return registered?.state === 'working'
          },
          turnDispatchFailed: async (_id, turnId, publish) =>
            controller.finishLifecycleTurn(turnId, callbackPublisher(publish)),
          runnerEventStored: async (envelope, publish) => {
            const event = envelope.event
            if (
              event.type === 'turn.started' ||
              event.type === 'start.updated'
            ) {
              await controller.reportRunnerLifecycle(
                event,
                callbackPublisher(publish),
              )
            }
            await projectWorkspaceTitle(env.DB, envelope, now())
          },
        },
        resolvers.callbackObservers,
      ),
    },
    { sockets, storage: context.storage },
  )
  const devices = new DeviceRuntime(
    env,
    storage,
    chat,
    matches,
    { context, sockets, autoResponseAt: resolvers.socketAutoResponseAt },
    (when) => alarms.set('devices', when),
    now,
    async (request, at, publish) => {
      const session = await chat.store.read(request.workspaceId, (view) =>
        view.session(request.sessionId),
      )
      try {
        return await controller.projectDeviceState(
          request.workspaceId,
          session?.choice,
          at,
          callbackPublisher(publish),
        )
      } catch (error) {
        if (
          error instanceof HttpError &&
          error.status === 404 &&
          error.code === 'workspace_not_found'
        )
          return true
        throw error
      }
    },
  )
  const platform = nativeWorkspacePlatform(
    context,
    ({ workspaceId, event, occurredAt }) =>
      chat.commitWorkspaceEvent(workspaceId, event, occurredAt),
    nativeWorkspaceStorage(storage, {
      guarded: true,
      generation: generations.current,
    }),
  )
  const controller: WorkspaceController = createWorkspaceController(
    env,
    dependencies,
    {
      ...platform,
      assertStartActive: (turn) =>
        assertReceiverActive(storage, generations.forTurn(turn)),
      hasOutsideTurns: () => chat.store.hasOutsideTurns,
      deviceWaiting: (id) => devices.waiting(id),
      stopping: async (id) => {
        for (const hook of stoppedHooks) await hook(id)
      },
      readChatRecovery: (id) =>
        chat.store.read(id, async (view) => {
          const recovery = await view.lifecycleRecovery()
          return {
            ...recovery,
            runningTurns: recovery.runningTurns.map((turn) => ({
              turnId: turn.id,
              sessionId: turn.sessionId,
              senderUserId: turn.senderId,
            })),
          }
        }),
      chatRecovered: () => context.waitUntil(devices.reconcile()),
      admitFirstMessage: async (input) => {
        const identity = await firstMessageIdentity(env, input.workspaceId)
        if (
          !identity ||
          identity.orgId !== input.orgId ||
          identity.id !== input.firstTurn.senderUserId
        )
          throw new HttpError(
            404,
            'workspace_not_found',
            'The workspace is not available.',
          )
        await chat.acceptFirstMessage({
          workspaceId: input.workspaceId,
          sessionId: input.firstTurn.sessionId,
          turnId: input.firstTurn.turnId,
          request: input.firstMessage,
          firstSessionTitle: input.firstSessionTitle,
          sender: identity,
        })
      },
      stopped: async (id) => {
        for (const hook of stoppedHooks) await hook(id)
        await chat.stopWorkspace(id)
        context.waitUntil(devices.reconcile())
      },
    },
  )
  return {
    storage,
    chat,
    devices,
    controller,
    files,
    alarms,
    sockets,
    withGeneration: generations.withGeneration,
    reconcileStopped: () => devices.reconcile(),
    onStopped: (hook: (id: string) => Promise<void>) => stoppedHooks.push(hook),
  }
}
