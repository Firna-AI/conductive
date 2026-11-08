import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { record, string } from './inputs'

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

it('projects the stored cursor, visible output and dispatched work without treating queued input or metadata as output', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(session.id, 'summary-message')
  expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toEqual({
    throughEventNumber: 3,
    lastOutputEventNumber: 0,
    working: false,
  })
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const command = runner.commands.find((entry) => entry.type === 'turn')
  if (!command || command.type !== 'turn')
    throw new Error('The turn command is missing.')
  const turnId = command.turnId
  expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toEqual({
    throughEventNumber: 4,
    lastOutputEventNumber: 0,
    working: true,
  })
  runner.emit({
    type: 'assistant.delta',
    sessionId: session.id,
    turnId,
    messageId: 'answer',
    text: 'An unread answer',
  })
  runner.emit({ type: 'workspace.title', name: 'Metadata only' })
  await fixture.drain()
  expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toEqual({
    throughEventNumber: 6,
    lastOutputEventNumber: 5,
    working: true,
  })
  runner.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId,
    state: 'finished',
    durationMs: 1,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['summary-message'],
  })
  await fixture.drain()
  const expected = {
    throughEventNumber: 8,
    lastOutputEventNumber: 7,
    working: false,
  }
  expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toEqual(expected)
  fixture.restart()
  expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toEqual(expected)
  const history = await fixture.history(session.id)
  expect(
    string(
      record(
        history.events.find(({ event }) => event.type === 'assistant.delta')
          ?.event,
      ).text,
    ),
  ).toBe('An unread answer')
})
