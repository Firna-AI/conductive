import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { deviceFixture } from './codex-device.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'codex',
    model: 'test-codex',
    effort: 'high',
    fast: false,
  })
})
afterAll(() => harness.dispose())

it('replaces an own endpoint with ChatGPT and clears endpoint metadata before reporting connection', async () => {
  const fixture = await deviceFixture(harness)
  const path = agentLoginPath('codex')
  const endpoint = {
    agent: 'codex',
    kind: 'endpoint',
    endpoint: 'https://proxy.example.test/v1',
    secret: 'endpoint-key',
  }
  const saveEndpoint = () =>
    harness.request(path, fixture.cookie, {
      method: 'PUT',
      body: JSON.stringify(endpoint),
    })
  expect((await saveEndpoint()).status).toBe(200)
  await harness.env.DB.prepare(
    `UPDATE agent_logins SET endpoint_model_ids = '["endpoint-model"]',
      endpoint_models_read_at = 10, endpoint_models_attempted_at = 20,
      endpoint_models_attempt_id = 'endpoint-attempt'
      WHERE user_id = ? AND agent = 'codex'`,
  )
    .bind(fixture.account.user.id)
    .run()
  expect((await fixture.start()).status).toBe(200)
  fixture.approve()
  fixture.setTime(TEST_TIME + 5000)
  expect(await (await fixture.poll()).json()).toEqual({
    state: 'connected',
    login: {
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: TEST_TIME + 5000,
    },
  })
  expect(
    await harness.env.DB.prepare(
      `SELECT endpoint_origin, endpoint_model_ids, endpoint_models_read_at,
       endpoint_models_attempted_at, endpoint_models_attempt_id
       FROM agent_logins WHERE user_id = ? AND agent = 'codex'`,
    )
      .bind(fixture.account.user.id)
      .first(),
  ).toEqual({
    endpoint_origin: null,
    endpoint_model_ids: null,
    endpoint_models_read_at: null,
    endpoint_models_attempted_at: null,
    endpoint_models_attempt_id: null,
  })
  await harness.env.DB.prepare(
    `UPDATE agent_logins SET refresh_claim = 'old-claim', refresh_claim_until = 100,
      failure_cause = 'old-failure' WHERE user_id = ? AND agent = 'codex'`,
  )
    .bind(fixture.account.user.id)
    .run()
  harness.setTime(TEST_TIME + 10_000)
  expect((await saveEndpoint()).status).toBe(200)
  expect(
    await harness.env.DB.prepare(
      `SELECT kind, no_reuse, refresh_claim, refresh_claim_until, failure_cause
       FROM agent_logins WHERE user_id = ? AND agent = 'codex'`,
    )
      .bind(fixture.account.user.id)
      .first(),
  ).toEqual({
    kind: 'endpoint',
    no_reuse: 0,
    refresh_claim: null,
    refresh_claim_until: null,
    failure_cause: null,
  })
})
