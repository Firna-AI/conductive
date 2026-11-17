import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { agentLoginPath } from '../../src/shared/account'
import type { AutomationResponse } from '../../src/shared/automations'
import { orgAgentLoginPath } from '../../src/shared/org-settings'
import { write } from '../members/members-test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { automationFixture } from './routes.test-support'
import { startAutomationRun } from './run-starter'
import { runFixture } from './runs.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('names the owner default login for another member reading an automation', async () => {
  const { org, member, other, admin, seed } = await automationFixture(harness)
  const path = await seed()
  const personalPath = agentLoginPath('codex')
  expect(
    (
      await harness.request(
        personalPath,
        other.session,
        write({ agent: 'codex', kind: 'api-key', secret: 'reader-key' }, 'PUT'),
      )
    ).status,
  ).toBe(200)
  const read = async () => {
    const response = await harness.request(path, other.session)
    expect(response.status).toBe(200)
    const body: AutomationResponse = await response.json()
    expect(body.automation.owner.id).toBe(member.user.id)
    expect(JSON.stringify(body)).not.toContain('reader-key')
    expect(JSON.stringify(body)).not.toContain('org-reader-key')
    expect(JSON.stringify(body)).not.toContain('owner-key')
    return body.runLogin
  }
  expect(await read()).toBeNull()
  const orgPath = orgAgentLoginPath(org.id, 'codex')
  expect(
    (
      await harness.request(
        orgPath,
        admin.session,
        write(
          { agent: 'codex', kind: 'api-key', secret: 'org-reader-key' },
          'PUT',
        ),
      )
    ).status,
  ).toBe(200)
  expect(await read()).toEqual({ type: 'org', orgId: org.id })
  expect(
    (
      await harness.request(
        personalPath,
        member.session,
        write({ agent: 'codex', kind: 'api-key', secret: 'owner-key' }, 'PUT'),
      )
    ).status,
  ).toBe(200)
  expect(await read()).toEqual({ type: 'personal', userId: member.user.id })
  expect(
    (
      await harness.request(
        orgPath,
        admin.session,
        write({ useForEveryMember: true }, 'PATCH'),
      )
    ).status,
  ).toBe(200)
  expect(await read()).toEqual({ type: 'org', orgId: org.id })
})

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
