import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceCallbackObservers } from '../chat/workspace-callbacks'
import type { WorkspaceEventEnvelope } from '../chat/workspace-events'

export type NativeChatObservers = WorkspaceCallbackObservers

export function nativeChatObservers() {
  const observers: NativeChatObservers = {}
  const published: WorkspaceEventEnvelope[] = []
  const stored: WorkspaceEventEnvelope[] = []
  const callbacks: WorkspaceCallbackObservers = {
    runnerEventStored: async (...args) => {
      stored.push(structuredClone(args[0]))
      await observers.runnerEventStored?.(...args)
    },
    runnerReady: async (...args) => observers.runnerReady?.(...args),
    runnerDisconnected: async (...args) =>
      observers.runnerDisconnected?.(...args),
    turnDispatching: async (...args) => observers.turnDispatching?.(...args),
    turnDispatchFailed: async (...args) =>
      observers.turnDispatchFailed?.(...args),
    receiveFileResult: async (...args) =>
      observers.receiveFileResult?.(...args),
  }
  return {
    observers,
    callbacks,
    observePublications: (chat: WorkspaceChat) => {
      const change = chat.store.change.bind(chat.store)
      chat.store.change = (id, work, committed) =>
        change(id, work, (batch) => {
          committed(batch)
          published.push(...structuredClone(batch))
        })
    },
    takeEvents: async () => published.splice(0),
    takeStoredEvents: async () => stored.splice(0),
  }
}
