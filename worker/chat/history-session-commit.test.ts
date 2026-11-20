import { expect, it } from 'vitest'
import { checkCommitBoundaries } from './commit-boundary.test-support'
import {
  historySessionKey,
  SESSION_INDEX_THROUGH,
} from './history-session-keys'
import { sessionAnswer } from './history-session-index.test-support'
import { nativeChatStore } from './native-store.test-support'
import { CHAT_META, chatEventKey } from './storage-keys'
import { ChatStore } from './store'

it('commits session index entries and progress atomically with each emitted event', async () => {
  await checkCommitBoundaries(async () => {
    const { storage, failNextCommit, clearFaults } = await nativeChatStore()
    const store = new ChatStore(storage, () => 25)
    await store.change(
      'workspace',
      (view) => view.emit(sessionAnswer('first')),
      () => undefined,
    )
    return {
      failNextCommit,
      clearFaults,
      action: async (error) => {
        await expect(
          store.change(
            'workspace',
            (view) => view.emit(sessionAnswer('second')),
            () => undefined,
          ),
        ).rejects.toThrow(error)
      },
      read: async () => ({
        event: (await storage.get<{ eventNumber: number }>(chatEventKey(2)))
          ?.eventNumber,
        index: await storage.get(historySessionKey('session', 2)),
        indexedThrough: await storage.get(SESSION_INDEX_THROUGH),
        eventThrough: (await storage.get<{ through: number }>(CHAT_META))
          ?.through,
      }),
      before: {
        event: undefined,
        index: undefined,
        indexedThrough: 1,
        eventThrough: 1,
      },
      after: { event: 2, index: 2, indexedThrough: 2, eventThrough: 2 },
      restart: async () => undefined,
    }
  })
})
