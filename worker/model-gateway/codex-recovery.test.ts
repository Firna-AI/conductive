import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX, WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { runningGatewayTurn } from './fixture.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('claims one Codex 401 recovery across concurrent requests and preserves it after eviction', async () => {
  const { fixture, runner, turn, token, issue } = await runningGatewayTurn(
    harness,
    CODEX,
    { kind: 'token', protocolVersion: 2 },
  )
  const results = await Promise.all([
    fixture.actor.lifecycle.checkTurnToken(token, true),
    fixture.actor.lifecycle.checkTurnToken(token, true),
  ])
  expect(
    results.map((result) => result.ok && result.codexRecoveryClaimed),
  ).toEqual([true, false])
  expect(
    results.map((result) => result.ok && result.codexRecoveryPending),
  ).toEqual([true, true])
  await fixture.chat.closeConnections()
  await fixture.restart()
  await fixture.connect(runner)
  const recovered = await fixture.actor.lifecycle.checkTurnToken(token, true)
  expect(recovered).toMatchObject({
    ok: true,
    codexRecoveryClaimed: false,
    codexRecoveryPending: true,
  })
  expect(
    await fixture.actor.lifecycle.checkTurnToken(token, 'complete'),
  ).toMatchObject({ ok: true, codexRecoveryPending: false })
  expect(
    await fixture.actor.lifecycle.checkTurnToken(token, true),
  ).toMatchObject({
    ok: true,
    codexRecoveryClaimed: false,
    codexRecoveryPending: false,
  })
  expect(await issue()).toBe(token)
  const saved = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.turn(turn.turnId),
  )
  expect(saved?.gateway).toMatchObject({ codexRecoveryUsed: true })
  expect(JSON.stringify([...(await fixture.snapshot()).records])).not.toContain(
    token,
  )
  await fixture.chat.closeConnections()
})
