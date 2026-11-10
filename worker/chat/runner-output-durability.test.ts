import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { WorkspaceEventEnvelope } from './workspace-events'
import { TOOL_DETAIL_MAX_BYTES } from '../../src/shared/chat-events'
import { createHarness, type TestHarness } from '../test-support/harness'
import { outputFixture } from './runner-output.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { ChatStore } from './store'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('commits encrypted held text with the raw cursor and releases it once after live retry, restart, replay, and a gap', async () => {
  const hooks: WorkspaceEventEnvelope[] = []
  const f = await outputFixture(
    harness,
    { TOKEN: 'org-private-value' },
    {
      runnerEventStored: async (event) => {
        hooks.push(event)
      },
    },
  )
  const delta = {
    type: 'assistant.delta' as const,
    ...f.context,
    messageId: 'answer',
    text: 'org-private-',
  }
  f.storage.beforeCommit = async (staged) => {
    const cursor = await new ChatStore(staged, () => 25).read(
      WORKSPACE_ID,
      (view) => view.cursor('fake-stream-1'),
    )
    if (cursor === 3) throw new Error('Injected output commit failure')
  }
  f.runner.emit(delta)
  await expect(f.drain()).rejects.toThrow('Injected output commit failure')
  expect(f.runner.pendingEvents()).toHaveLength(1)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.cursor('fake-stream-1'),
    ),
  ).toBe(2)
  f.storage.beforeCommit = null
  await f.connect(f.runner)
  expect(f.runner.pendingEvents()).toEqual([])
  const before = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  expect(
    before.events.filter(({ event }) => event.type === 'assistant.delta'),
  ).toEqual([])
  expect(JSON.stringify([...f.storage.records])).not.toContain('org-private-')
  f.restart()
  await f.connect(f.runner)
  expect(f.runner.received.at(-1)).toMatchObject({
    type: 'welcome',
    confirmedThrough: 3,
  })
  const last = await f.emit({ ...delta, text: 'value!' })
  f.runner.sendEnvelope(last)
  f.runner.sendEnvelope({ ...last, eventNumber: 6 })
  await f.drain()
  expect(f.runner.received).toContainEqual({
    type: 'resend',
    streamId: 'fake-stream-1',
    fromEventNumber: 5,
  })
  await f.emit({ ...delta, text: 'org-' })
  await f.emit({
    type: 'assistant.completed',
    ...f.context,
    messageId: 'answer',
    text: 'done',
    userMessageIds: [f.messageId],
  })
  const history = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  const answers = hooks.filter(
    ({ event }) =>
      event.type === 'assistant.delta' || event.type === 'assistant.completed',
  )
  expect(answers.map(({ event }) => event)).toEqual([
    { ...delta, text: '[redacted]!' },
    { ...delta, text: 'org-' },
    {
      type: 'assistant.completed',
      ...f.context,
      messageId: 'answer',
      text: 'done',
      userMessageIds: [f.messageId],
    },
  ])
  expect(
    history.events
      .filter(({ event }) => event.type === 'assistant.completed')
      .map(({ event }) => event),
  ).toEqual([answers.at(-1)?.event])
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.cursor('fake-stream-1'),
    ),
  ).toBe(6)
})

it('bounds expanded filtered tool detail and permanently refuses an expanded envelope once', async () => {
  const f = await outputFixture(harness, {
    SHORT: { value: 'a', secret: true },
  })
  await f.emit({
    type: 'tool.updated',
    ...f.context,
    tool: {
      id: 'tool',
      kind: 'run',
      target: 'a',
      detail: 'a'.repeat(TOOL_DETAIL_MAX_BYTES - 2),
      omittedDetailBytes: 17,
      state: 'done',
    },
  })
  const history = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  expect(history.events.at(-1)?.event).toEqual({
    type: 'tool.updated',
    ...f.context,
    tool: {
      id: 'tool',
      kind: 'run',
      target: '[redacted]',
      detail: '[redacted]'.repeat(6553) + '[red',
      omittedDetailBytes: 589823,
      state: 'done',
    },
  })
  const oversized = await f.emit({
    type: 'workspace.title',
    name: 'a'.repeat(110_000),
  })
  f.runner.sendEnvelope(oversized)
  await f.drain()
  const refused = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  expect(
    refused.events
      .filter(({ event }) => event.type === 'runner.event-refused')
      .map(({ event }) => event),
  ).toEqual([
    {
      type: 'runner.event-refused',
      streamId: 'fake-stream-1',
      runnerEventNumber: 4,
      runnerEventType: 'workspace.title',
      reason: 'too_large',
      sessionId: null,
      turnId: null,
    },
  ])
  expect(f.runner.pendingEvents()).toEqual([])
})
