import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { outputFixture } from './runner-output.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { part, sourceRecords } from './tool-detail.test-support'
import { readChatEvent } from '../../src/chat/api/read-chat'
import { record } from './inputs'
import { FakeRunner } from '../test-support/fake-runner'

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

it('filters complete tool sources across parts and JSON cuts with Unicode, literal markers, and complete omitted counts', async () => {
  const f = await outputFixture(harness, {
    TOKEN: { value: 'secretpass', secret: true },
    MARKER: { value: 'redacted', secret: true },
    SHORT: { value: 'q', secret: true },
  })
  const prefix = '"'.repeat(32763) + '🦀'
  await f.emit(part(f.context, prefix + 'secr', 1))
  await f.emit(part(f.context, 'etpass|[reda', 2))
  const pending = await f.history(f.context.sessionId)
  expect(
    pending.events.filter(({ event }) => event.type === 'runner.event-refused'),
  ).toHaveLength(0)
  expect(
    pending.events.filter(({ event }) => event.type === 'tool.updated'),
  ).toHaveLength(0)
  await f.emit(part(f.context, 'cted]|ordinary🦀\u0001"', 3, true))
  const result = await f.history(f.context.sessionId)
  const updates = result.events.flatMap(({ event }) =>
    event.type === 'tool.updated' ? [event] : [],
  )
  expect(updates).toHaveLength(1)
  expect(updates[0]?.tool.detail === prefix + '[red').toBe(true)
  expect(updates[0]?.tool).toMatchObject({
    target: '[redacted]',
    omittedDetailBytes: 49,
    state: 'done',
  })
  await f.emit(part(f.context, '[reda', 1))
  await f.emit(part(f.context, 'cted] ordinary', 2, true))
  const ordinary = await f.history(f.context.sessionId)
  expect(ordinary.events.at(-1)?.event).toMatchObject({
    type: 'tool.updated',
    tool: { detail: '[redacted] ordinary', omittedDetailBytes: 17 },
  })
  await f.emit(part(f.context, 'q'.repeat(5000), 1))
  await f.emit(part(f.context, 'q'.repeat(5000), 2, true))
  const expanded = await f.history(f.context.sessionId)
  const last = expanded.events.at(-1)?.event
  expect(last?.type).toBe('tool.updated')
  expect(
    last &&
      'tool' in last &&
      last.tool.detail === '[redacted]'.repeat(6553) + '[red',
  ).toBe(true)
  expect(last && 'tool' in last && last.tool.omittedDetailBytes).toBe(34483)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.readTool('fake-stream-1'),
    ),
  ).toBeUndefined()
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
})

it('uses compatible refusal markers and clears interrupted private sources while keeping late and null details', async () => {
  const f = await outputFixture(harness, {})
  const otherSession = await f.createSession()
  await f.send(otherSession.id, 'other-message')
  const other = f.runner.commands.find(
    (command) =>
      command.type === 'turn' && command.sessionId === otherSession.id,
  )
  if (other?.type !== 'turn') throw new Error('Expected another stored turn.')
  const otherContext = { sessionId: other.sessionId, turnId: other.turnId }
  const missingContext = {
    sessionId: 'missing-session',
    turnId: 'missing-turn',
  }
  await f.emit(part(f.context, 'held source', 1))
  await f.emit(part(f.context, 'wrong sequence', 3, true))
  await f.emit(part(f.context, 'held source with stored root IDs', 1))
  await f.emit({
    ...part(f.context, 'wrong sequence with stored root IDs', 3, true),
    ...otherContext,
  })
  await f.emit(part(f.context, 'held source with missing root IDs', 1))
  await f.emit({
    ...part(f.context, 'wrong sequence with missing root IDs', 3, true),
    ...missingContext,
  })
  await f.emit(part({ ...f.context, turnId: 'missing' }, 'unavailable', 1))
  const oversized = await f.emit(part(f.context, 'z'.repeat(1_048_576), 1))
  f.runner.sendEnvelope(oversized)
  await f.drain()
  const refused = await f.history(f.context.sessionId)
  const all = await f.chat.store.read(WORKSPACE_ID, (view) => view.history(0))
  const markers = all.events.flatMap(({ event }) =>
    event.type === 'runner.event-refused' ? [event] : [],
  )
  expect(
    markers.map(({ runnerEventType, reason }) => ({ runnerEventType, reason })),
  ).toEqual([
    { runnerEventType: 'tool.updated', reason: 'invalid' },
    { runnerEventType: 'tool.updated', reason: 'invalid' },
    { runnerEventType: 'tool.updated', reason: 'invalid' },
    { runnerEventType: 'tool.updated', reason: 'turn_not_active' },
    { runnerEventType: 'tool.updated', reason: 'too_large' },
  ])
  for (const marker of markers)
    expect(readChatEvent(record(marker))).toEqual(marker)
  expect(
    markers.map(({ sessionId, turnId }) => ({ sessionId, turnId })),
  ).toEqual([
    f.context,
    f.context,
    f.context,
    { sessionId: null, turnId: null },
    f.context,
  ])
  expect(
    refused.events.flatMap(({ event }) =>
      event.type === 'runner.event-refused' ? [event.reason] : [],
    ),
  ).toEqual(['invalid', 'invalid', 'invalid', 'too_large'])
  expect(JSON.stringify(refused)).not.toContain('held source')
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.readTool('fake-stream-1'),
    ),
  ).toBeUndefined()
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
  await f.emit(part(f.context, 'interrupted by terminal event', 1))
  await f.emit({
    type: 'turn.completed',
    ...f.context,
    state: 'finished',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [f.messageId],
  })
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
  await f.emit(part(f.context, 'late ordinary', 1))
  await f.emit(part(f.context, ' text', 2, true))
  await f.emit({
    type: 'tool.updated',
    ...f.context,
    tool: {
      id: 'null',
      kind: 'run',
      target: 'target',
      detail: null,
      omittedDetailBytes: 0,
      state: 'done',
    },
  })
  const late = await f.history(f.context.sessionId)
  expect(
    late.events.flatMap(({ event }) =>
      event.type === 'tool.updated' ? [event.tool] : [],
    ),
  ).toEqual([
    {
      id: 'tool',
      kind: 'run',
      target: 'secretpass',
      detail: 'late ordinary text',
      omittedDetailBytes: 17,
      state: 'done',
    },
    {
      id: 'null',
      kind: 'run',
      target: 'target',
      detail: null,
      omittedDetailBytes: 0,
      state: 'done',
    },
  ])
  await f.emit(part(f.context, 'abandoned source', 1))
  await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'new-stream' }),
  )
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.readTool('fake-stream-1'),
    ),
  ).toBeUndefined()
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
})
