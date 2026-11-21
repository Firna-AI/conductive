import { expect, it } from 'vitest'

import { setupProviderStopTests } from '../chat/provider-stop.test-support'
import {
  messageCommands,
  terminalEvent,
} from '../chat/turn-lifecycle.test-support'
import { recordProviderRun, runState } from './provider-stop.test-support'
import { readAutomation } from './automation-data'

const fixtureForTest = setupProviderStopTests()

it('keeps an uncertain continuation pending across eviction and reports its resolved outcome', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  await fixture.send(session.id, 'source')
  const original = messageCommands(fixture.runner, 'source')[0]
  if (original?.type !== 'turn') throw new Error('Missing original turn')
  await recordProviderRun(fixture, session.id, original.turnId)
  await fixture.disconnect(fixture.runner)
  fixture.runner.emit({
    type: 'turn.started',
    sessionId: session.id,
    turnId: original.turnId,
    senderId: fixture.owner.id,
    choice: session.choice,
    startedAt: fixture.clock.now(),
    messageIds: ['source'],
  })
  await fixture.stopForProvider()
  await fixture.restart()
  await fixture.connect(fixture.runner)
  expect(await runState(fixture)).toEqual({ state: 'started', code: null })
  fixture.runner.emit(terminalEvent(original, 'stopped'))
  await fixture.drain()
  const next = fixture.runner.commands
    .filter((command) => command.type === 'turn')
    .at(-1)
  expect(next).toMatchObject({
    type: 'turn',
    message: { id: expect.stringMatching(/^continuation:/) },
  })
  if (next?.type !== 'turn') throw new Error('Missing resolved continuation')
  expect(await runState(fixture)).toEqual({ state: 'started', code: null })
  fixture.runner.emit(terminalEvent(next, 'finished'))
  await fixture.drain()
  expect(await runState(fixture)).toEqual({ state: 'finished', code: null })
  expect(
    (await readAutomation(fixture.env.DB, fixture.org.id, 'chat-automation'))
      .failedRunsInARow,
  ).toBe(0)
})
