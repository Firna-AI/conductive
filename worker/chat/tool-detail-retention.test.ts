import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { captureEnvironment, outputFixture } from './runner-output.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { part, sourceRecords } from './tool-detail.test-support'

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

it('rescans all retained source with newly active values before the Unicode JSON cut and complete byte count', async () => {
  const f = await outputFixture(harness, {})
  const prefix = '"'.repeat(32760) + '🦀'
  await f.emit(
    part(
      f.context,
      prefix + 'later-secret|ordinary🦀\n' + 'x'.repeat(70000),
      1,
    ),
  )
  const pending = await f.history(f.context.sessionId)
  expect(
    pending.events.some(({ event }) => event.type === 'tool.updated'),
  ).toBe(false)
  const retained = sourceRecords((await f.snapshot()).records)
  expect(retained.size).toBeGreaterThan(1)
  for (const ciphertext of retained.values()) {
    expect(typeof ciphertext).toBe('string')
    expect(JSON.stringify(ciphertext).length).toBeLessThan(131072)
    expect(String(ciphertext)).not.toContain('later-secret')
  }
  await captureEnvironment(f, {
    LATER: { value: 'later-secret', secret: true },
    TARGET: { value: 'secretpass', secret: true },
  })
  await f.restart()
  await f.connect(f.runner)
  await f.emit(part(f.context, 'ta', 2))
  const appended = sourceRecords((await f.snapshot()).records)
  expect(new Map([...appended].filter(([key]) => retained.has(key)))).toEqual(
    retained,
  )
  expect(appended.size).toBeGreaterThan(retained.size)
  const final = await f.emit(part(f.context, 'il', 3, true))
  f.runner.sendEnvelope(final)
  await f.drain()
  const history = await f.history(f.context.sessionId)
  const tools = history.events.flatMap(({ event }) =>
    event.type === 'tool.updated' ? [event.tool] : [],
  )
  expect(tools).toHaveLength(1)
  expect(tools[0]?.detail === prefix + '[redacted]').toBe(true)
  expect(tools[0]).toMatchObject({
    target: '[redacted]',
    omittedDetailBytes: 70035,
    state: 'done',
  })
  const replay = await f.tab()
  expect(
    replay.messages
      .flatMap((message) =>
        message.type === 'history' ? message.history.events : [],
      )
      .filter(({ event }) => event.type === 'tool.updated'),
  ).toEqual(history.events.filter(({ event }) => event.type === 'tool.updated'))
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.readTool('fake-stream-1'),
    ),
  ).toBeUndefined()
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
  const literal = 'a'.repeat(16379) + '[redacted] ordinary '
  await f.emit(part(f.context, literal + '[reda', 1))
  await captureEnvironment(f, { MARKER: { value: 'redacted', secret: true } })
  await f.emit(part(f.context, 'cted]', 2, true))
  const markers = await f.history(f.context.sessionId)
  expect(markers.events.at(-1)?.event).toMatchObject({
    type: 'tool.updated',
    tool: { detail: literal + '[redacted]', omittedDetailBytes: 17 },
  })
  await replay.close()
})
