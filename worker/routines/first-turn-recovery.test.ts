import { afterAll, beforeAll, expect, it } from 'vitest'

import { createChatFixture } from '../chat/harness.test-support'
import { terminalEvent } from '../chat/turn-lifecycle.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { seedChatRun } from './first-turn.test-support'
import { readRoutine } from './routine-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('reports the first turn after a crash between its chat commit and its run update', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const accepted = await fixture.send(session.id)
  await seedChatRun(fixture, accepted.session.activeTurnId!, session.id)
  const turn = runner.commands.find((command) => command.type === 'turn')
  if (turn?.type !== 'turn') throw new Error('Missing dispatched turn')
  fixture.storage.crashAfterCommit = true
  runner.emit(terminalEvent(turn, 'failed'))
  await expect(fixture.drain()).rejects.toThrow('Injected post-commit crash')
  expect(
    await fixture.env.DB.prepare(
      "SELECT state FROM routine_runs WHERE id = 'first-run'",
    ).first('state'),
  ).toBe('started')
  fixture.restart()
  await fixture.connect(runner)
  await fixture.drain()
  expect(
    await fixture.env.DB.prepare(
      "SELECT state, error_code AS code FROM routine_runs WHERE id = 'first-run'",
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'agent_unavailable',
  })
  expect(
    (await readRoutine(fixture.env.DB, fixture.org.id, 'chat-routine'))
      .failedRunsInARow,
  ).toBe(1)
  fixture.chat.closeConnections()
})
