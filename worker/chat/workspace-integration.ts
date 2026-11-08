import { HttpError } from '../http'
import { DeviceRuntime } from '../devices/runtime'
import { createWorkspaceController } from '../lifecycle/workspace-controller'
import { nativeWorkspacePlatform } from '../lifecycle/workspace-platform'
import {
  lifecycleDependencies,
  type LifecycleEnvironment,
} from '../lifecycle/runtime'
import type { LifecyclePublisher } from '../lifecycle/durable-types'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import { WorkspaceChat } from './backend'
import { firstMessageIdentity } from './first-message'
import { updateWorkspaceTitle } from './queries'
import type { ChatCallbackPublisher, ChatDependencies } from './types'

export type WorkspaceCompositionEnv = LifecycleEnvironment
export type WorkspaceChatResolvers = Partial<
  Pick<ChatDependencies, 'resolveAttachments' | 'scheduleRunnerCheck'>
>

function callbackPublisher(publish: ChatCallbackPublisher): LifecyclePublisher {
  return ({ event, occurredAt }) => publish(event, occurredAt)
}

export function createWorkspaceIntegration(
  context: DurableObjectState,
  env: WorkspaceCompositionEnv,
  now: () => number,
  resolvers: WorkspaceChatResolvers = {},
) {
  const dependencies = { ...lifecycleDependencies(), now }
  const matches = (name: string) =>
    env.WORKSPACES.idFromName(name).equals(context.id)
  const chat: WorkspaceChat = new WorkspaceChat(context.storage, env, {
    ...resolvers,
    now,
    matchesObject: matches,
    waitUntil: (promise) => context.waitUntil(promise),
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
      const state = await controller.readLifecycle()
      if (!state) return true
      if (!['ready', 'working', 'unread', 'input'].includes(state.state))
        return false
      await controller.registerLifecycleTurn(turn, callbackPublisher(publish))
      const registered = await controller.readLifecycle()
      return registered?.state === 'working'
    },
    turnDispatchFailed: async (_id, turnId, publish) =>
      controller.finishLifecycleTurn(turnId, callbackPublisher(publish)),
    runnerEventStored: async (envelope, publish) => {
      const event = envelope.event
      const lifecyclePublish = callbackPublisher(publish)
      if (event.type === 'runner.event-refused') {
        if (
          event.turnId &&
          (event.runnerEventType === 'turn.completed' ||
            event.runnerEventType === 'turn.failed')
        )
          await controller.finishLifecycleTurn(event.turnId, lifecyclePublish)
      } else if (
        event.type === 'turn.started' ||
        event.type === 'turn.completed' ||
        event.type === 'turn.failed' ||
        event.type === 'start.updated'
      ) {
        await controller.reportRunnerLifecycle(event, lifecyclePublish)
      }
      if (event.type === 'workspace.title')
        await updateWorkspaceTitle(
          env.DB,
          envelope.workspaceId,
          event.name,
          now(),
        )
      if (
        event.type === 'turn.completed' ||
        event.type === 'turn.failed' ||
        (event.type === 'runner.event-refused' &&
          (event.runnerEventType === 'turn.completed' ||
            event.runnerEventType === 'turn.failed'))
      )
        context.waitUntil(devices.reconcile())
    },
  })
  const devices = new DeviceRuntime(
    env,
    context.storage,
    chat,
    matches,
    (when) => context.storage.setAlarm(when),
    now,
    async (request, at, publish) => {
      const session = await chat.store.read(request.workspaceId, (view) =>
        view.session(request.sessionId),
      )
      return controller.projectDeviceState(
        request.workspaceId,
        session?.choice,
        at,
        callbackPublisher(publish),
      )
    },
  )
  const platform = nativeWorkspacePlatform(
    context,
    ({ workspaceId, event, occurredAt }) =>
      chat.commitWorkspaceEvent(workspaceId, event, occurredAt),
  )
  const controller: WorkspaceController = createWorkspaceController(
    env,
    dependencies,
    {
      ...platform,
      deviceWaiting: (id) => devices.waiting(id),
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
          sender: identity,
        })
      },
      stopped: async (id) => {
        await chat.stopWorkspace(id)
        context.waitUntil(devices.reconcile())
      },
    },
  )
  return { chat, devices, controller }
}
