import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'

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

it('records the authenticated close member before interrupt and keeps the first stopper', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'first')
  const trace: string[] = []
  const tab = await fixture.tab(0, (message) => {
    if (
      message.type === 'event' &&
      message.envelope.event.type === 'turn.stop-requested'
    )
      trace.push('stop')
  })
  fixture.observeOutgoing((command) => {
    if (command.type === 'interrupt') trace.push('interrupt')
    return false
  })
  const response = await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
    { stopRunningTurn: true, requestedById: fixture.owner.id },
    fixture.memberCookie,
  )
  expect(response.status).toBe(200)
  expect(
    (await fixture.history(session.id)).events
      .map(({ event }) => event)
      .filter((event) => event.type === 'turn.stop-requested'),
  ).toEqual([
    {
      type: 'turn.stop-requested',
      sessionId: session.id,
      turnId: turn.turnId,
      requestedById: fixture.member.id,
    },
  ])
  expect(trace).toEqual(['stop', 'interrupt'])
  await fixture.changeWorkspace(WORKSPACE_ID, async (transaction) => {
    const stored = await transaction.turn(turn.turnId)
    if (!stored) throw new Error('The stopped turn is missing.')
    delete stored.stopRequest
    await transaction.saveTurn(stored)
  })
  await fixture.fetch(
    sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
    { turnId: turn.turnId },
  )
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turn.turnId),
    ),
  ).toMatchObject({ stopRequest: { requestedById: fixture.member.id } })
  runner.emit(terminalEvent(turn, 'stopped'))
  await fixture.drain()
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    ),
  ).toMatchObject({ activeTurnId: null, closedAt: 1_800_000_000_000 })
  await tab.close()
})
