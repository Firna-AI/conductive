import type { WorkspaceChat } from '../chat/backend'
import type { WorkspaceCallbackObservers } from '../chat/workspace-callbacks'
import type { WorkspaceEventEnvelope } from '../chat/workspace-events'

export type NativeChatObservers = WorkspaceCallbackObservers

export function nativeChatObservers() {
  const observers: NativeChatObservers = {}
  const published: WorkspaceEventEnvelope[] = []
  const publications: WorkspaceEventEnvelope[] = []
  const stored: WorkspaceEventEnvelope[] = []
  let publicationFailure: string | null = null
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
    turnEnded: async (...args) => observers.turnEnded?.(...args),
    receiveFileResult: async (...args) =>
      observers.receiveFileResult?.(...args),
  }
  return {
    observers,
    callbacks,
    observePublications: (chat: WorkspaceChat) => {
      const publish = chat.browsers.publish.bind(chat.browsers)
      chat.browsers.publish = (events, completeChanges) => {
        if (publicationFailure && events.length)
          throw new Error(publicationFailure)
        publish(events, completeChanges)
        publications.push(...structuredClone(events))
      }
      const change = chat.store.change.bind(chat.store)
      chat.store.change = (id, work, committed) =>
        change(id, work, (batch) => {
          committed(batch)
          published.push(...structuredClone(batch))
        })
    },
    takeEvents: async () => published.splice(0),
    takePublications: async () => publications.splice(0),
    failPublication: async (message: string | null) => {
      publicationFailure = message
    },
    takeStoredEvents: async () => stored.splice(0),
  }
}
