import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import type { ChatCallbackPublisher, ChatDependencies } from '../chat/types'
import type { WorkspaceEventEnvelope } from '../../src/shared/events'

export type NativeChatObservers = Partial<
  Pick<
    ChatDependencies,
    | 'runnerEventStored'
    | 'runnerReady'
    | 'runnerDisconnected'
    | 'turnDispatching'
    | 'turnDispatchFailed'
    | 'receiveFileResult'
  >
>

export function nativeChatObservers(
  chat: WorkspaceChat,
  controller: WorkspaceController,
  workspaceId: () => string | undefined,
) {
  const observers: NativeChatObservers = {}
  const published: WorkspaceEventEnvelope[] = []
  let observing = false
  const publisher =
    (id: string): ChatCallbackPublisher =>
    (event, at) =>
      chat.commitWorkspaceEvent(id, event, at)
  const change = chat.store.change.bind(chat.store)
  chat.store.change = async (id, work, committed) => {
    const events: WorkspaceEventEnvelope[] = []
    const result = await change(id, work, (batch) => {
      events.push(...batch)
      published.push(...structuredClone(batch))
      committed(batch)
    })
    if (!observing && observers.runnerEventStored) {
      observing = true
      try {
        for (const event of events) {
          if (
            /^(?:assistant\.|tool\.|turn\.|files\.|changes\.|runner\.|workspace\.title$|start\.)/.test(
              event.event.type,
            )
          )
            await observers.runnerEventStored(event, publisher(id))
        }
      } finally {
        observing = false
      }
    }
    return result
  }
  const report = controller.reportRunnerLifecycle.bind(controller)
  controller.reportRunnerLifecycle = async (event, publish) => {
    await report(event, publish)
    const id = workspaceId()
    if (event.type === 'runner.ready' && id)
      await observers.runnerReady?.(id, publisher(id))
  }
  const disconnected = controller.runnerLifecycleDisconnected.bind(controller)
  controller.runnerLifecycleDisconnected = async (publish) => {
    await disconnected(publish)
    const id = workspaceId()
    if (id) await observers.runnerDisconnected?.(id, publisher(id))
  }
  const register = controller.registerLifecycleTurn.bind(controller)
  controller.registerLifecycleTurn = async (turn, publish) => {
    await register(turn, publish)
    const id = workspaceId()
    if (id) await observers.turnDispatching?.(id, turn, publisher(id))
  }
  const finish = controller.finishLifecycleTurn.bind(controller)
  controller.finishLifecycleTurn = async (turn, publish) => {
    await finish(turn, publish)
    const id = workspaceId()
    if (id) await observers.turnDispatchFailed?.(id, turn, publisher(id))
  }
  return {
    observers,
    takeEvents: async () => published.splice(0),
  }
}
