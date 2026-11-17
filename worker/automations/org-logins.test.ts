import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { orgAgentLoginPath } from '../../src/shared/org-settings'
import { createHarness, type TestHarness } from '../test-support/harness'
import { startAutomationRun } from './run-starter'
import { runFixture } from './runs.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('starts a run for an owner with only an org login and keeps the owner as the first-message sender', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user } = fixture
  const saved = await harness.request(
    orgAgentLoginPath(org.id, 'codex'),
    fixture.session,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'codex',
        kind: 'api-key',
        secret: 'org-run-key',
      }),
    },
  )
  expect(saved.status).toBe(200)
  await runtime.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
    .bind(user.id)
    .run()
  await fixture.seedRun()
  await fixture.run(() => startAutomationRun(runtime, org.id, 'run-one'))
  expect(
    await runtime.env.DB.prepare(
      'SELECT state, workspace_id AS workspaceId, error_code AS code FROM automation_runs',
    ).first(),
  ).toEqual({ state: 'started', workspaceId: expect.any(String), code: null })
  expect(fixture.acceptFirstMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      sender: user,
      request: expect.objectContaining({
        choice: {
          agent: 'codex',
          model: 'run-model',
          effort: 'high',
          fast: false,
        },
      }),
    }),
  )
  expect(
    await runtime.env.DB.prepare(
      'SELECT owner_user_id AS owner FROM workspaces',
    ).first('owner'),
  ).toBe(user.id)
})
