import { afterAll, beforeAll, expect, it } from 'vitest'
import { agentKey } from '../../src/shared/transcript/item-keys'
import {
  emptyTranscript,
  foldEvent,
} from '../../src/shared/transcript/transcript'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { outputFixture } from './runner-output.test-support'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
it('keeps a refused completion prefix encrypted and masks late text from a new stream', async () => {
  const f = await outputFixture(harness, { TOKEN: 'private-value' })
  const delta = {
    type: 'assistant.delta' as const,
    ...f.context,
    messageId: 'answer',
  }
  await f.emit({ ...delta, text: 'private-' })
  const refused = await f.emit({
    type: 'assistant.completed',
    ...f.context,
    messageId: 'answer',
    text: 'Replacement text',
    userMessageIds: ['unavailable-message'],
  })
  const before = await f.history(f.context.sessionId)
  expect(before.events.map(({ event }) => event)).toContainEqual({
    type: 'runner.event-refused',
    streamId: refused.streamId,
    runnerEventNumber: refused.eventNumber,
    runnerEventType: 'assistant.completed',
    reason: 'invalid',
    ...f.context,
  })
  const ciphertext = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.output.readContexts(),
  )
  const end = await f.emit({
    type: 'turn.completed',
    ...f.context,
    state: 'finished',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [f.messageId],
  })
  await f.restart()
  const resumed = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'resumed-stream' }),
  )
  resumed.emit({ ...delta, text: 'val' })
  await f.drain()
  await f.restart()
  await f.connect(resumed)
  const continuation = resumed.emit({ ...delta, text: 'ue and value' })
  await f.drain()
  const history = await f.history(f.context.sessionId)
  const transcript = history.events.reduce((current, envelope) => {
    const { event, occurredAt, late } = envelope
    return event.type === 'assistant.delta' ||
      event.type === 'assistant.completed'
      ? foldEvent(current, event, occurredAt, late)
      : current
  }, emptyTranscript)
  expect(transcript.items).toEqual([
    {
      kind: 'agent',
      id: agentKey(f.context.turnId, 'answer'),
      turnId: f.context.turnId,
      text: 'private-[redacted] and value',
    },
  ])
  expect(ciphertext).toEqual(expect.any(String))
  expect(ciphertext).not.toContain('private-')
  expect(resumed.pendingEvents()).toEqual([])
  expect(
    await f.chat.store.read(WORKSPACE_ID, async (view) => [
      await view.cursor(end.streamId),
      await view.cursor(continuation.streamId),
    ]),
  ).toEqual([end.eventNumber, continuation.eventNumber])
})
