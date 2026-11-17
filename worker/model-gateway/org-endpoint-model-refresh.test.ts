import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  orgEndpoint,
  orgLoginFixture,
  savedOrgLogin,
} from '../app-api/org-agent-logins.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { refreshEndpointModels } from './endpoint-model-refresh'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterAll(async () => harness.dispose())

it('claims org background reads once per ten minutes and leaves other orgs untouched', async () => {
  const api = await orgLoginFixture(harness)
  const login = {
    agent: 'claude',
    kind: 'endpoint',
    endpoint: orgEndpoint,
    secret: 'org-key',
  } as const
  expect((await api.save(login)).status).toBe(200)
  const other = await harness.createOrg(api.admin, 'Other org')
  expect((await api.save(login, api.admin, other.id)).status).toBe(200)
  const otherInitial = await savedOrgLogin(harness, other.id)
  let now = TEST_TIME + 600_000
  const dependencies = { now: () => now, fetch: api.upstream.fetch }
  api.upstream.response = () => new Response(null, { status: 503 })
  expect(
    await Promise.all([
      refreshEndpointModels(
        harness.env,
        { orgId: api.org.id },
        'claude',
        dependencies,
        { background: true },
      ),
      refreshEndpointModels(
        harness.env,
        { orgId: api.org.id },
        'claude',
        dependencies,
        { background: true },
      ),
    ]),
  ).toEqual([false, false])
  expect(api.upstream.requests).toHaveLength(3)
  now += 599_999
  expect(
    await refreshEndpointModels(
      harness.env,
      { orgId: api.org.id },
      'claude',
      dependencies,
      { background: true },
    ),
  ).toBe(false)
  expect(api.upstream.requests).toHaveLength(3)
  now += 1
  api.upstream.response = () =>
    Response.json({ data: [{ id: 'other-claude' }] })
  expect(
    await refreshEndpointModels(
      harness.env,
      { orgId: api.org.id },
      'claude',
      dependencies,
      { background: true },
    ),
  ).toBe(true)
  expect(api.upstream.requests).toHaveLength(4)
  expect(await savedOrgLogin(harness, api.org.id)).toMatchObject({
    ids: '["other-claude"]',
    readAt: TEST_TIME + 1_200_000,
    updatedAt: TEST_TIME,
  })
  expect(await savedOrgLogin(harness, other.id)).toEqual(otherInitial)
})
