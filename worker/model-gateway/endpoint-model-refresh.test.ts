import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { endpointModelApi } from '../app-api/endpoint-models.test-support'
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
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('claims one background read across instances for ten minutes, including failures', async () => {
  const cookie = await harness.login()
  const api = endpointModelApi(harness)
  await api.save(cookie)
  const { user } = await api.account(cookie)
  let now = TEST_TIME + 600_000
  const dependencies = { now: () => now, fetch: api.upstream.fetch }
  api.upstream.response = () => new Response(null, { status: 503 })
  await Promise.all([
    refreshEndpointModels(
      { ...harness.env },
      user.id,
      'claude',
      { ...dependencies },
      { background: true },
    ),
    refreshEndpointModels(
      { ...harness.env },
      user.id,
      'claude',
      { ...dependencies },
      { background: true },
    ),
  ])
  expect(api.upstream.requests).toHaveLength(2)
  expect((await api.account(cookie)).agentLogins[0]).toMatchObject({
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  now += 599_999
  await refreshEndpointModels(harness.env, user.id, 'claude', dependencies, {
    background: true,
  })
  expect(api.upstream.requests).toHaveLength(2)
  now += 1
  api.upstream.response = () =>
    Response.json({ data: [{ id: 'other-claude' }] })
  await refreshEndpointModels(harness.env, user.id, 'claude', dependencies, {
    background: true,
  })
  expect(api.upstream.requests).toHaveLength(3)
  expect((await api.account(cookie)).agentLogins[0]).toMatchObject({
    modelList: { missing: ['test-claude'], checkedAt: TEST_TIME + 1_200_000 },
  })
})
