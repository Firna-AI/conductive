import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createChatFixture } from '../chat/harness.test-support'
import { terminalEvent } from '../chat/turn-lifecycle.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { seedChatRun } from './first-turn.test-support'
import { readAutomation } from './automation-data'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
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
  await fixture.failNextCommit('after', 'Injected post-commit crash')
  runner.emit(terminalEvent(turn, 'failed'))
  await expect(fixture.drain()).rejects.toThrow('Injected post-commit crash')
  expect(
    await fixture.env.DB.prepare(
      "SELECT state FROM automation_runs WHERE id = 'first-run'",
    ).first('state'),
  ).toBe('started')
  await fixture.restart()
  await fixture.connect(runner)
  await fixture.drain()
  expect(
    await fixture.env.DB.prepare(
      "SELECT state, error_code AS code FROM automation_runs WHERE id = 'first-run'",
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'agent_unavailable',
  })
  expect(
    (await readAutomation(fixture.env.DB, fixture.org.id, 'chat-automation'))
      .failedRunsInARow,
  ).toBe(1)
  await fixture.chat.closeConnections()
})

it('keeps chat working while the run report fails, and retries the report from the alarm', async () => {
  const fixture = await createChatFixture(harness)
  const db = fixture.env.DB
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const accepted = await fixture.send(session.id)
  await seedChatRun(fixture, accepted.session.activeTurnId!, session.id)
  const turn = runner.commands.find((command) => command.type === 'turn')
  if (turn?.type !== 'turn') throw new Error('Missing dispatched turn')
  const runState = () =>
    db
      .prepare(
        "SELECT state, error_code AS code FROM automation_runs WHERE id = 'first-run'",
      )
      .first()
  await db.exec('ALTER TABLE automation_runs RENAME TO automation_runs_hidden')
  await fixture.actor.api.controls.captureWarnings(true)
  try {
    runner.emit(terminalEvent(turn, 'failed'))
    await fixture.drain()
    const warnings = (await fixture.actor.api.controls.warningCalls()).flat()
    expect(warnings).toContainEqual(
      expect.objectContaining({
        kind: 'automation_report_failed',
        retry: 'scheduled',
        error: { kind: 'd1', reason: 'no_such_table' },
      }),
    )
    expect(warnings).not.toContainEqual(
      expect.objectContaining({ kind: 'runner_message_failed' }),
    )
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
    await db.exec(
      'ALTER TABLE automation_runs_hidden RENAME TO automation_runs',
    )
  }
  expect(await runState()).toEqual({ state: 'started', code: null })
  await fixture.actor.api.controls.advance(TEST_TIME + 60_000)
  expect(await runState()).toEqual({
    state: 'failed',
    code: 'agent_unavailable',
  })
  await fixture.chat.closeConnections()
})
