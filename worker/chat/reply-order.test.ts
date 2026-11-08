import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  sessionsPath,
  sessionPath,
  sessionPaths,
  type SessionResponse,
} from '../../src/shared/sessions'
import {
  createHarness,
  type TestHarness,
  TEST_TIME,
} from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'

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

it('orders session reads and writes with the workspace event sequence', async () => {
  const fixture = await createChatFixture(harness)
  const created = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
    { choice: CLAUDE },
  )
  const first: SessionResponse = await created.json()
  expect(first.eventNumber).toBe(1)
  const sessionId = first.session.id
  const tab = await fixture.tab()
  const rename = await fixture.fetch(
    sessionPath(fixture.org.id, WORKSPACE_ID, sessionId),
    { title: 'Renamed' },
    undefined,
    'PATCH',
  )
  expect(await rename.json()).toMatchObject({
    eventNumber: 2,
    session: { title: 'Renamed' },
  })
  const model = await fixture.fetch(
    sessionPaths.model(fixture.org.id, WORKSPACE_ID, sessionId),
    {
      choice: { ...CLAUDE, effort: 'medium' },
      draft: { text: '', attachmentIds: [] },
      newSessionId: 'unused',
    },
    undefined,
    'PUT',
  )
  expect(await model.json()).toMatchObject({ eventNumber: 3, created: false })
  const linked = await fixture.fetch(
    sessionPaths.model(fixture.org.id, WORKSPACE_ID, sessionId),
    {
      choice: CODEX,
      draft: { text: 'Keep', attachmentIds: [] },
      newSessionId: 'linked',
    },
    undefined,
    'PUT',
  )
  expect(await linked.json()).toMatchObject({ eventNumber: 4, created: true })
  const closed = await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, sessionId),
    { stopRunningTurn: false },
  )
  expect(await closed.json()).toMatchObject({
    eventNumber: 5,
    session: { closedAt: TEST_TIME },
  })
  const reopened = await fixture.fetch(
    sessionPaths.reopen(fixture.org.id, WORKSPACE_ID, sessionId),
    {},
  )
  expect(await reopened.json()).toMatchObject({
    eventNumber: 6,
    session: { closedAt: null },
  })
  const accepted = await fixture.send(sessionId)
  expect(accepted.eventNumber).toBe(8)
  const stopped = await fixture.fetch(
    sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, sessionId),
    { turnId: accepted.session.activeTurnId },
  )
  expect(await stopped.json()).toEqual({
    eventNumber: 11,
    turnId: accepted.session.activeTurnId,
    state: 'stopped',
  })
  const repeated = await fixture.send(sessionId)
  expect(repeated.eventNumber).toBe(11)
  const read = await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
  expect(await read.json()).toMatchObject({
    eventNumber: 11,
    sessions: [{ id: sessionId }, { id: 'linked' }],
  })
  expect(tab.messages.at(-1)).toMatchObject({
    type: 'event',
    envelope: { eventNumber: 11 },
  })
  tab.close()
})

it('reads the stored active turn start time after dispatch and a runner start', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  expect(session.activeTurnStartedAt).toBeNull()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const accepted = await fixture.send(session.id)
  const command = runner.commands[0]
  if (command?.type !== 'turn')
    throw new Error('The dispatched turn is missing.')
  const read = () =>
    fixture.chat.store.read(WORKSPACE_ID, (view) => view.session(session.id))
  expect(await read()).toMatchObject({
    activeTurnId: command.turnId,
    activeTurnStartedAt: TEST_TIME,
  })
  runner.emit({
    type: 'turn.started',
    sessionId: session.id,
    turnId: command.turnId,
    senderId: fixture.owner.id,
    choice: CLAUDE,
    startedAt: TEST_TIME - 100,
    messageIds: [accepted.message.id],
  })
  await fixture.drain()
  fixture.restart()
  expect(await read()).toMatchObject({
    activeTurnId: command.turnId,
    activeTurnStartedAt: TEST_TIME - 100,
  })
})
