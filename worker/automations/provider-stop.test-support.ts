import { expect } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import { WORKSPACE_ID, type ChatFixture } from '../chat/harness.test-support'
import { seedChatRun } from './first-turn.test-support'
import { readAutomation } from './automation-data'
import { readAutomationRun } from './run-list-data'

export async function recordProviderRun(
  fixture: ChatFixture,
  sessionId: string,
  turnId: string,
) {
  await seedChatRun(fixture, turnId, sessionId, 'source')
  await fixture.env.DB.prepare(
    'UPDATE automation_runs SET choice_json = ? WHERE id = ?',
  )
    .bind(
      JSON.stringify({
        agent: 'claude',
        model: 'test-claude',
        effort: 'high',
        fast: false,
      }),
      'first-run',
    )
    .run()
}

export async function runState(fixture: ChatFixture) {
  return fixture.env.DB.prepare(
    "SELECT state, error_code AS code FROM automation_runs WHERE id = 'first-run'",
  ).first()
}

export async function assertFailedProviderRun(
  fixture: ChatFixture,
  code: string,
) {
  expect(await runState(fixture)).toEqual({ state: 'failed', code })
  expect(
    await readAutomation(fixture.env.DB, fixture.org.id, 'chat-automation'),
  ).toMatchObject({ failedRunsInARow: 1, active: true })
  const run = await readAutomationRun(
    fixture.env.DB,
    fixture.org.id,
    'first-run',
  )
  expect(run).toMatchObject({
    workspaceId: WORKSPACE_ID,
    error: { code, source: 'provider_stop' },
    agent: 'claude',
    owner: { id: fixture.owner.id },
  })
}

export async function reconnectContinuation(
  fixture: ChatFixture,
  streamId: string,
) {
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, streamId }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const command = runner.commands.find((command) => command.type === 'turn')
  if (command?.type !== 'turn') throw new Error('Missing continuation turn')
  runner.emit({
    type: 'turn.started',
    sessionId: command.sessionId,
    turnId: command.turnId,
    senderId: fixture.owner.id,
    choice: command.message.choice,
    startedAt: fixture.clock.now(),
    messageIds: [command.message.id],
  })
  await fixture.drain()
  return { runner, command }
}

export async function recordNextProviderRun(
  fixture: ChatFixture,
  sessionId: string,
  turnId: string,
  index: number,
) {
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      "UPDATE automation_runs SET id = ? WHERE id = 'first-run'",
    ).bind(`provider-run-${index - 1}`),
    fixture.env.DB.prepare(
      'UPDATE workspace_runtime SET first_turn_id = ?, session_id = ?, first_message_id = ? WHERE workspace_id = ?',
    ).bind(turnId, sessionId, `source-${index}`, WORKSPACE_ID),
    fixture.env.DB.prepare(
      `INSERT INTO automation_runs
      (id, automation_id, org_id, owner_user_id, run_key, message_id, trigger_json, state, workspace_id, created_at, updated_at)
      VALUES ('first-run', 'chat-automation', ?, ?, ?, ?, '{"kind":"run-now"}', 'started', ?, ?, ?)`,
    ).bind(
      fixture.org.id,
      fixture.owner.id,
      `manual:provider-${index}`,
      `source-${index}`,
      WORKSPACE_ID,
      fixture.clock.now(),
      fixture.clock.now(),
    ),
  ])
}
