import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { orgAgentLoginPath } from '../../src/shared/org-settings'
import { deferred } from '../model-gateway/http.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  orgEndpoint,
  orgLoginFixture,
  savedOrgLogin,
} from './org-agent-logins.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterAll(async () => harness.dispose())

it('accepts only org API keys and endpoints and a boolean switch', async () => {
  const api = await orgLoginFixture(harness)
  for (const agent of ['claude', 'codex'] as const) {
    for (const body of [
      { agent, kind: 'token', secret: 'subscription-token' },
      { agent: 'other', kind: 'api-key', secret: 'key' },
    ]) {
      const response = await api.request(
        orgAgentLoginPath(api.org.id, agent),
        api.admin,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        },
      )
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: {
          code: 'invalid_input',
          message: 'Check the message and try again.',
        },
      })
    }
    expect(await savedOrgLogin(harness, api.org.id, agent)).toBeNull()
  }
  const response = await api.request(
    orgAgentLoginPath(api.org.id, 'claude'),
    api.admin,
    {
      method: 'PATCH',
      body: JSON.stringify({ useForEveryMember: 'true' }),
    },
  )
  expect(response.status).toBe(400)
})

it('refuses an endpoint replacement when the admin role changes during discovery', async () => {
  const api = await orgLoginFixture(harness)
  expect((await api.save()).status).toBe(200)
  const initial = await savedOrgLogin(harness, api.org.id)
  const started = deferred<void>()
  const release = deferred<Response>()
  api.upstream.responseFactories.push(() => {
    started.resolve()
    return release.promise
  })
  const pending = api.save({
    agent: 'claude',
    kind: 'endpoint',
    endpoint: orgEndpoint,
    secret: 'new-key',
  })
  await started.promise
  try {
    await harness.env.DB.prepare(
      "UPDATE org_members SET role = 'member' WHERE org_id = ? AND user_id = ?",
    )
      .bind(api.org.id, api.userId)
      .run()
  } finally {
    release.resolve(Response.json({ data: [{ id: 'other-claude' }] }))
  }
  const response = await pending
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({
    error: {
      code: 'admin_required',
      message: 'Ask an org admin to make this change.',
    },
  })
  expect(await savedOrgLogin(harness, api.org.id)).toEqual(initial)
})

it('keeps the model list when the admin role changes during Refresh', async () => {
  const api = await orgLoginFixture(harness)
  expect(
    (
      await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint: orgEndpoint,
        secret: 'org-key',
      })
    ).status,
  ).toBe(200)
  const initial = await savedOrgLogin(harness, api.org.id)
  const started = deferred<void>()
  const release = deferred<Response>()
  api.upstream.responseFactories.push(() => {
    started.resolve()
    return release.promise
  })
  const pending = api.refresh()
  await started.promise
  try {
    await harness.env.DB.prepare(
      "UPDATE org_members SET role = 'member' WHERE org_id = ? AND user_id = ?",
    )
      .bind(api.org.id, api.userId)
      .run()
  } finally {
    release.resolve(Response.json({ data: [{ id: 'other-claude' }] }))
  }
  expect((await pending).status).toBe(403)
  expect(await savedOrgLogin(harness, api.org.id)).toEqual(initial)
})

it('omits model details from suspended org reads and refuses its login writes', async () => {
  const api = await orgLoginFixture(harness)
  expect(
    (
      await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint: orgEndpoint,
        secret: 'org-key',
      })
    ).status,
  ).toBe(200)
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, api.org.id)
    .run()
  expect(await (await api.read()).json()).toEqual({
    defaultLogins: ['claude', 'codex'].map((agent) => ({
      orgId: api.org.id,
      orgName: api.org.name,
      agent,
      login: null,
    })),
    agentLogins: [
      {
        agent: 'claude',
        connected: true,
        kind: 'endpoint',
        host: 'proxy.example.test:8443',
        useForEveryMember: false,
        updatedAt: TEST_TIME,
      },
      { agent: 'codex', connected: false },
    ],
  })
  const response = await api.switch(true)
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'org_suspended' },
  })
})
