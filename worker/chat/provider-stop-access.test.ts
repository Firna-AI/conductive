import { expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { CLAUDE, WORKSPACE_ID } from './harness.test-support'
import { PROVIDER_STOP_START_KEY } from './provider-stop-start'
import { setupProviderStopTests } from './provider-stop.test-support'
import { lifecycleSnapshot, startTurn } from './turn-lifecycle.test-support'
import { TurnLifecycle } from './turn-lifecycle'

const fixtureForTest = setupProviderStopTests()

it('preserves member Stop, session close, login failure, and queued work without a continuation or automatic start', async () => {
  const fixture = await fixtureForTest()
  const stopping = await fixture.createSession()
  const closing = await fixture.createSession()
  const failing = await fixture.createSession()
  const stopped = await startTurn(fixture, fixture.runner, stopping.id, 'stop')
  await startTurn(fixture, fixture.runner, closing.id, 'close')
  const failed = await startTurn(fixture, fixture.runner, failing.id, 'fail')
  await fixture.fetch(
    sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, stopping.id),
    { turnId: stopped.turnId },
  )
  await fixture.send(stopping.id, 'waiting')
  await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, closing.id),
    { stopRunningTurn: true },
  )
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    const session = await view.session(failing.id)
    if (!session) throw new Error('Missing session')
    await new TurnLifecycle(view, session).fail(
      failed.turnId,
      'The login is not available.',
      () => 'login-interrupt',
    )
  })
  await fixture.stopForProvider()
  const state = await lifecycleSnapshot(fixture)
  expect(state.turns.map((turn) => turn.state).sort()).toEqual([
    'failed',
    'queued',
    'stopped',
    'stopped',
  ])
  expect(
    state.turns.find((turn) => turn.messageIds.includes('waiting')),
  ).toMatchObject({ state: 'queued', messageIds: ['waiting'] })
  expect(
    state.sessions.find((session) => session.id === closing.id)?.closedAt,
  ).toBe(fixture.clock.now())
  for (const session of [stopping, closing, failing]) {
    const events = (await fixture.history(session.id)).events.map(
      ({ event }) => event,
    )
    expect(events.filter((event) => event.type === 'turn.continued')).toEqual(
      [],
    )
    expect(
      events.filter(
        (event) =>
          event.type === 'turn.completed' &&
          event.endReason === 'cloud_computer_stopped',
      ),
    ).toEqual([])
  }
  expect(await fixture.storage.get(PROVIDER_STOP_START_KEY)).toBeUndefined()
  const queuedOnly = await fixture.createSession()
  await fixture.send(queuedOnly.id, 'queued-only')
  const before = await lifecycleSnapshot(fixture)
  await fixture.stopForProvider()
  expect(await lifecycleSnapshot(fixture)).toEqual(before)
  expect(await fixture.storage.get(PROVIDER_STOP_START_KEY)).toBeUndefined()
})

it('ends eligible turns with reconnect or message when the sender cannot use the session login', async () => {
  const fixture = await fixtureForTest()
  const missing = await fixture.createSession()
  const unshared = await fixture.createSession()
  const departed = await fixture.createSession()
  await startTurn(fixture, fixture.runner, missing.id, 'missing-login')
  for (const [session, id] of [
    [unshared, 'unshared'],
    [departed, 'departed'],
  ] as const) {
    await fixture.send(session.id, id, fixture.memberCookie)
    const command = fixture.runner.commands.find(
      (command) => command.type === 'turn' && command.sessionId === session.id,
    )
    if (command?.type !== 'turn') throw new Error('Missing member turn')
    fixture.runner.emit({
      type: 'turn.started',
      sessionId: session.id,
      turnId: command.turnId,
      senderId: fixture.member.id,
      choice: CLAUDE,
      startedAt: fixture.clock.now(),
      messageIds: [id],
    })
    await fixture.drain()
  }
  // Keep the unshared case in the org while testing the missing sender separately.
  await fixture.harness.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ? AND agent = 'claude'",
  )
    .bind(fixture.owner.id)
    .run()
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    const session = await view.session(missing.id)
    if (!session) throw new Error('Missing login session')
    session.login = { type: 'personal', userId: 'removed-login-owner' }
    await view.saveSession(session)
    const active = (await view.turns()).find(
      (turn) => turn.sessionId === departed.id,
    )
    if (!active) throw new Error('Missing departed turn')
    active.senderId = 'departed-member'
    await view.saveTurn(active)
  })
  await fixture.stopForProvider()
  for (const [session, next] of [
    [missing, 'reconnect'],
    [unshared, 'message'],
    [departed, 'message'],
  ] as const) {
    const events = (await fixture.history(session.id)).events.map(
      ({ event }) => event,
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'turn.completed',
        state: 'stopped',
        endReason: 'cloud_computer_stopped',
      }),
    )
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'turn.continued',
        turnId: null,
        next,
      }),
    )
  }
  expect(
    (await lifecycleSnapshot(fixture)).turns.filter(
      (turn) => turn.state === 'queued',
    ),
  ).toEqual([])
  expect(await fixture.storage.get(PROVIDER_STOP_START_KEY)).toBeUndefined()
})
