import { afterAll, beforeAll, expect, it } from 'vitest'

import type { HeldOutput } from '../../src/shared/output-sanitizer'
import { encrypt } from '../security/crypto'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { outputFixture } from './runner-output.test-support'
import { chatKey } from './storage-keys'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('migrates legacy released context across streams and keeps unpublished text in its original stream', async () => {
  const f = await outputFixture(harness, { TOKEN: 'private-value' })
  const delta = { type: 'assistant.delta' as const, ...f.context }
  const saveLegacy = async (streamId: string, state: readonly HeldOutput[]) => {
    const key = chatKey('output-filter', streamId)
    await f.storage.put(key, 1)
    await f.storage.put(
      `${key}:0`,
      await encrypt(
        JSON.stringify(state),
        JSON.stringify(['runner-output', WORKSPACE_ID, streamId]),
        f.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
  }
  const workspaceKey = chatKey('output-context', 'workspace')
  await f.storage.delete(workspaceKey)
  await f.storage.delete(`${workspaceKey}:0`)
  await saveLegacy('legacy-context', [
    {
      event: { ...delta, messageId: 'released-answer', text: '' },
      secrets: [],
      contexts: [{ text: 'private-', secrets: ['private-value'] }],
    },
  ])
  await saveLegacy('legacy-pending', [
    {
      event: { ...delta, messageId: 'held-answer', text: 'private-' },
      secrets: ['private-value'],
    },
  ])
  await f.emit({ ...delta, messageId: 'released-answer', text: 'value' })
  const first = await f.history(f.context.sessionId)
  expect(first.events.at(-1)?.event).toEqual({
    ...delta,
    messageId: 'released-answer',
    text: '[redacted]',
  })
  await f.emit({ ...delta, messageId: 'held-answer', text: 'public' })
  const resumed = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'legacy-context' }),
  )
  resumed.emit({ ...delta, messageId: 'released-answer', text: 'value' })
  await f.drain()
  const pending = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId: 'legacy-pending' }),
  )
  pending.emit({ ...delta, messageId: 'held-answer', text: 'value' })
  await f.drain()
  const history = await f.history(f.context.sessionId)
  expect(
    history.events.flatMap(({ event }) =>
      event.type === 'assistant.delta'
        ? [{ messageId: event.messageId, text: event.text }]
        : [],
    ),
  ).toEqual([
    { messageId: 'released-answer', text: '[redacted]' },
    { messageId: 'held-answer', text: 'public' },
    { messageId: 'released-answer', text: 'value' },
    { messageId: 'held-answer', text: '[redacted]' },
  ])
  expect(JSON.stringify([...f.storage.records])).not.toContain('private-')
  expect(pending.pendingEvents()).toEqual([])
})
