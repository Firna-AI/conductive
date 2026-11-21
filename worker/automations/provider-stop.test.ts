import { expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { setupProviderStopTests } from '../chat/provider-stop.test-support'
import { startTurn, terminalEvent } from '../chat/turn-lifecycle.test-support'
import { readAutomation } from './automation-data'
import { twoEarlierFailures } from './first-turn.test-support'
import {
  assertFailedProviderRun,
  recordNextProviderRun,
  recordProviderRun,
  reconnectContinuation,
  runState,
} from './provider-stop.test-support'
import { retryRequest } from '../chat/retry.test-support'

const fixtureForTest = setupProviderStopTests()

it.each(['finished', 'failed'] as const)(
  'reports the %s last continuation once and keeps it after manual retry',
  async (outcome) => {
    const fixture = await fixtureForTest()
    const session = await fixture.createSession()
    const source = await startTurn(
      fixture,
      fixture.runner,
      session.id,
      'source',
    )
    await recordProviderRun(fixture, session.id, source.turnId)
    await twoEarlierFailures(fixture)
    await fixture.stopForProvider()
    expect(await runState(fixture)).toEqual({ state: 'started', code: null })
    await fixture.restart()
    await reconnectContinuation(fixture, 'first-continuation')
    await fixture.clock.advance(900_000)
    await fixture.stopForProvider()
    expect(await runState(fixture)).toEqual({ state: 'started', code: null })
    await fixture.restart()
    const { runner, command } = await reconnectContinuation(
      fixture,
      'continued-outcome',
    )
    runner.emit(terminalEvent(command, outcome))
    await fixture.drain()
    expect(await runState(fixture)).toEqual({
      state: outcome,
      code: outcome === 'finished' ? null : 'agent_unavailable',
    })
    expect(
      await readAutomation(fixture.env.DB, fixture.org.id, 'chat-automation'),
    ).toMatchObject({
      failedRunsInARow: outcome === 'finished' ? 0 : 3,
      active: outcome === 'finished',
    })
    runner.emit(terminalEvent(command, outcome))
    await fixture.drain()
    if (outcome === 'failed') {
      expect(
        (await retryRequest(fixture, session.id, command.message.id)).status,
      ).toBe(202)
      const retry = runner.commands.find(
        (c) => c.type === 'turn' && c.turnId !== command.turnId,
      )
      if (retry?.type !== 'turn')
        throw new Error('Missing retried continuation')
      runner.emit(terminalEvent(retry, 'finished'))
      await fixture.drain()
    }
    expect(
      await readAutomation(fixture.env.DB, fixture.org.id, 'chat-automation'),
    ).toMatchObject({
      failedRunsInARow: outcome === 'finished' ? 0 : 3,
      active: outcome === 'finished',
    })
  },
)

it('fails the run when a continuation stops at the 15-minute guard', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  const source = await startTurn(fixture, fixture.runner, session.id, 'source')
  await recordProviderRun(fixture, session.id, source.turnId)
  await fixture.stopForProvider()
  await reconnectContinuation(fixture, 'guard-end')
  await fixture.clock.advance(899_999)
  await fixture.stopForProvider()
  await assertFailedProviderRun(fixture, 'cloud_computer_stopped')
})

it('fails the run when its chain reaches 30 days', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  const source = await startTurn(fixture, fixture.runner, session.id, 'source')
  await recordProviderRun(fixture, session.id, source.turnId)
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    const turn = await view.turn(source.turnId)
    const message = await view.message('source')
    if (!turn || !message) throw new Error('Missing expired chain')
    turn.chainStartedAt = fixture.clock.now() - 2_592_000_000
    message.createdAt = turn.chainStartedAt
    await view.saveMessage(message)
    await view.saveTurn(turn)
  })
  await fixture.stopForProvider()
  await assertFailedProviderRun(fixture, 'cloud_computer_stopped')
})

it('marks a provider-stop login loss for the run list to show the login check action', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession()
  const source = await startTurn(fixture, fixture.runner, session.id, 'source')
  await recordProviderRun(fixture, session.id, source.turnId)
  await fixture.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
    .bind(fixture.owner.id)
    .run()
  await fixture.stopForProvider()
  await assertFailedProviderRun(fixture, 'agent_login_required')
})

it('uses the computer-stop cause when the owner loses access to a working shared login', async () => {
  const fixture = await fixtureForTest()
  const session = await fixture.createSession(undefined, fixture.memberCookie)
  const source = await startTurn(fixture, fixture.runner, session.id, 'source')
  await recordProviderRun(fixture, session.id, source.turnId)
  await fixture.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ? AND agent = 'claude'",
  )
    .bind(fixture.member.id)
    .run()
  await fixture.stopForProvider()
  await assertFailedProviderRun(fixture, 'cloud_computer_stopped')
})

it('turns off after three provider-stop chains fail and counts each run once', async () => {
  const fixture = await fixtureForTest()
  let runner = fixture.runner
  for (const index of [1, 2, 3]) {
    if (index > 1) {
      await fixture.connect(runner)
      runner.emit({ type: 'runner.ready' })
      await fixture.drain()
    }
    const session = await fixture.createSession()
    const source = await startTurn(
      fixture,
      runner,
      session.id,
      index === 1 ? 'source' : `source-${index}`,
    )
    if (index === 1) await recordProviderRun(fixture, session.id, source.turnId)
    else await recordNextProviderRun(fixture, session.id, source.turnId, index)
    await fixture.stopForProvider()
    const active = await reconnectContinuation(
      fixture,
      `provider-count-${index}`,
    )
    runner = active.runner
    await fixture.stopForProvider()
    expect(await runState(fixture)).toEqual({
      state: 'failed',
      code: 'cloud_computer_stopped',
    })
    await fixture.stopForProvider()
    expect(
      await readAutomation(fixture.env.DB, fixture.org.id, 'chat-automation'),
    ).toMatchObject({
      failedRunsInARow: index,
      active: index < 3,
      inactiveReason: index < 3 ? null : 'failed_runs',
    })
  }
})
