import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createChatFixture } from '../chat/harness.test-support'
import { terminalEvent } from '../chat/turn-lifecycle.test-support'
import { retryRequest } from '../chat/retry.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { seedChatRun, twoEarlierFailures } from './first-turn.test-support'
import { readRoutine } from './routine-data'

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

it('reports a failed first turn once, turns off after three failures, and preserves that outcome through retry', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const accepted = await fixture.send(session.id)
  await seedChatRun(fixture, accepted.session.activeTurnId!, session.id)
  await twoEarlierFailures(fixture)
  const turn = runner.commands.find((command) => command.type === 'turn')
  if (turn?.type !== 'turn') throw new Error('Missing dispatched turn')
  runner.emit(terminalEvent(turn, 'failed'))
  await fixture.drain()
  expect(
    await fixture.env.DB.prepare(
      "SELECT state, error_code AS code, error_message AS message FROM routine_runs WHERE id = 'first-run'",
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'agent_unavailable',
    message: 'Try again.',
  })
  expect(
    await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'),
  ).toMatchObject({
    failedRunsInARow: 3,
    active: false,
    inactiveReason: 'failed_runs',
  })
  runner.emit(terminalEvent(turn, 'failed'))
  await fixture.drain()
  expect(
    (await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'))
      .failedRunsInARow,
  ).toBe(3)
  expect(
    (await retryRequest(fixture, session.id, turn.message.id)).status,
  ).toBe(202)
  await fixture.drain()
  const retry = runner.commands.find(
    (command) => command.type === 'turn' && command.turnId !== turn.turnId,
  )
  if (retry?.type !== 'turn') throw new Error('Missing retry turn')
  runner.emit(terminalEvent(retry, 'finished'))
  await fixture.drain()
  expect(
    (await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'))
      .failedRunsInARow,
  ).toBe(3)
  expect(
    await fixture.env.DB.prepare(
      "SELECT state FROM routine_runs WHERE id = 'first-run'",
    ).first('state'),
  ).toBe('failed')
  await fixture.chat.closeConnections()
})

it('resets the failure count when the first turn finishes and ignores a later failed turn', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const accepted = await fixture.send(session.id)
  await seedChatRun(fixture, accepted.session.activeTurnId!, session.id)
  await twoEarlierFailures(fixture)
  const turn = runner.commands.find((command) => command.type === 'turn')
  if (turn?.type !== 'turn') throw new Error('Missing dispatched turn')
  runner.emit(terminalEvent(turn, 'finished'))
  await fixture.drain()
  expect(
    (await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'))
      .failedRunsInARow,
  ).toBe(0)
  await fixture.send(session.id, 'later-message')
  const later = runner.commands.find(
    (command) => command.type === 'turn' && command.turnId !== turn.turnId,
  )
  if (later?.type !== 'turn') throw new Error('Missing later turn')
  runner.emit(terminalEvent(later, 'failed'))
  await fixture.drain()
  expect(
    (await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'))
      .failedRunsInARow,
  ).toBe(0)
  await fixture.chat.closeConnections()
})

it('reports a queued first turn failure when its login disappears before dispatch', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const accepted = await fixture.send(session.id)
  await seedChatRun(fixture, accepted.session.activeTurnId!, session.id)
  await fixture.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
    .bind(fixture.owner.id)
    .run()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(
    await fixture.env.DB.prepare(
      "SELECT state, error_code AS code FROM routine_runs WHERE id = 'first-run'",
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'agent_login_required',
  })
  expect(
    (await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'))
      .failedRunsInARow,
  ).toBe(1)
  expect(runner.commands).toEqual([])
  await fixture.chat.closeConnections()
})
