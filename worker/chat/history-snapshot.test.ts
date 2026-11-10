import { expect, it } from 'vitest'
import { nativeChatStore } from './native-store.test-support'
import { ChatStore } from './store'
it('keeps a history snapshot cutoff when newer answers and final tool states arrive between pages', async () => {
  const { storage } = await nativeChatStore()
  const store = new ChatStore(storage, () => 25)
  const context = { sessionId: 'session', turnId: 'turn' }
  const tool = {
    id: 'tool',
    kind: 'run' as const,
    target: 'test',
    detail: null,
    omittedDetailBytes: 0,
  }
  await store.change(
    'workspace',
    async (transaction) => {
      await transaction.emit({
        ...context,
        type: 'assistant.delta',
        messageId: 'answer',
        text: 'Pieces',
      })
      await transaction.emit({
        ...context,
        type: 'tool.updated',
        tool: { ...tool, state: 'running' },
      })
      for (let number = 3; number <= 32; number++)
        await transaction.emit({ type: 'workspace.title', name: `${number}` })
      await transaction.emit({
        ...context,
        type: 'assistant.completed',
        messageId: 'answer',
        text: 'Original answer',
        userMessageIds: [],
      })
      await transaction.emit({
        ...context,
        type: 'tool.updated',
        tool: { ...tool, state: 'done' },
      })
      await transaction.emit({ type: 'workspace.title', name: 'Snapshot end' })
    },
    () => undefined,
  )
  const first = await store.read('workspace', (view) => view.history(0))
  expect(first).toMatchObject({
    throughEventNumber: 35,
    hasMore: true,
    nextAfterEventNumber: 32,
  })
  expect(first.events.map((event) => event.eventNumber)).toEqual(
    Array.from({ length: 32 }, (_, index) => index + 1),
  )
  await store.change(
    'workspace',
    async (transaction) => {
      await transaction.emit({
        ...context,
        type: 'assistant.completed',
        messageId: 'answer',
        text: 'A newer answer',
        userMessageIds: [],
      })
      await transaction.emit({
        ...context,
        type: 'tool.updated',
        tool: { ...tool, state: 'failed' },
      })
    },
    () => undefined,
  )
  expect(await store.read('workspace', (view) => view.history(0, 35))).toEqual(
    first,
  )
  const second = await store.read('workspace', (view) => view.history(32, 35))
  expect(second).toEqual({
    throughEventNumber: 35,
    events: [
      {
        workspaceId: 'workspace',
        eventNumber: 33,
        occurredAt: 25,
        event: {
          ...context,
          type: 'assistant.completed',
          messageId: 'answer',
          text: 'Original answer',
          userMessageIds: [],
        },
      },
      {
        workspaceId: 'workspace',
        eventNumber: 34,
        occurredAt: 25,
        event: {
          ...context,
          type: 'tool.updated',
          tool: { ...tool, state: 'done' },
        },
      },
      {
        workspaceId: 'workspace',
        eventNumber: 35,
        occurredAt: 25,
        event: { type: 'workspace.title', name: 'Snapshot end' },
      },
    ],
  })
})
