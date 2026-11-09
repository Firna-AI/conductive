import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'claude',
    model: 'test-claude',
    effort: 'high',
  })
})
afterAll(async () => harness.dispose())

it('saves login reuse defaults and changes only the signed-in account preference without a secret', async () => {
  const first = await harness.login()
  const save = (
    cookie: string,
    agent: 'claude' | 'codex',
    kind: 'token' | 'api-key',
    secret = 'private-login',
  ) =>
    harness.request(agentLoginPath(agent), cookie, {
      method: 'PUT',
      body: JSON.stringify({ agent, kind, secret }),
    })
  const update = (
    cookie: string,
    agent: 'claude' | 'codex',
    noReuse: boolean,
  ) =>
    harness.request(agentLoginPath(agent), cookie, {
      method: 'PATCH',
      body: JSON.stringify({ noReuse }),
    })
  expect(await (await save(first, 'claude', 'token')).json()).toEqual({
    agent: 'claude',
    connected: true,
    kind: 'token',
    noReuse: true,
    updatedAt: TEST_TIME,
  })
  const stored = await harness.env.DB.prepare(
    "SELECT ciphertext, created_at AS createdAt, updated_at AS updatedAt FROM agent_logins WHERE agent = 'claude'",
  ).first()
  harness.github.profile = {
    id: 8,
    login: 'teammate',
    name: 'Teammate',
    avatar_url: null,
  }
  const other = await harness.login()
  expect(await (await save(other, 'claude', 'api-key')).json()).toMatchObject({
    noReuse: false,
  })
  expect(await (await save(first, 'codex', 'api-key')).json()).toMatchObject({
    noReuse: false,
  })
  harness.setTime(TEST_TIME + 1000)
  const updated = await update(first, 'claude', false)
  expect(updated.status).toBe(200)
  expect(await updated.json()).toEqual({
    agent: 'claude',
    connected: true,
    kind: 'token',
    noReuse: false,
    updatedAt: TEST_TIME,
  })
  const firstAccount = await harness.request(ACCOUNT_PATHS.account, first)
  expect(await firstAccount.json()).toMatchObject({
    agentLogins: [
      { agent: 'claude', noReuse: false, updatedAt: TEST_TIME },
      { agent: 'codex', noReuse: false },
    ],
  })
  expect(await (await update(first, 'claude', true)).json()).toMatchObject({
    noReuse: true,
    updatedAt: TEST_TIME,
  })
  expect(
    await harness.env.DB.prepare(
      `SELECT ciphertext, created_at AS createdAt, updated_at AS updatedAt FROM agent_logins
       WHERE user_id = (SELECT id FROM users WHERE github_id = 7) AND agent = 'claude'`,
    ).first(),
  ).toEqual(stored)
  expect(
    await (await harness.request(ACCOUNT_PATHS.account, other)).json(),
  ).toMatchObject({
    agentLogins: [
      { agent: 'claude', noReuse: false },
      { agent: 'codex', connected: false },
    ],
  })
  expect(
    await (await harness.request(ACCOUNT_PATHS.account, first)).json(),
  ).toMatchObject({
    agentLogins: [
      { agent: 'claude', noReuse: true },
      { agent: 'codex', noReuse: false },
    ],
  })
  expect(await (await update(other, 'claude', true)).json()).toMatchObject({
    noReuse: true,
  })
  expect(
    await (await save(other, 'claude', 'api-key', 'rotated-key')).json(),
  ).toMatchObject({
    noReuse: true,
    updatedAt: TEST_TIME + 1000,
  })
  expect(await (await save(other, 'claude', 'token')).json()).toMatchObject({
    noReuse: true,
  })
  expect(await (await update(other, 'claude', false)).json()).toMatchObject({
    noReuse: false,
  })
  expect(
    await (await save(other, 'claude', 'token', 'rotated-token')).json(),
  ).toMatchObject({ noReuse: false })
  expect(await (await save(other, 'claude', 'api-key')).json()).toMatchObject({
    noReuse: false,
  })
  expect(await (await save(other, 'claude', 'token')).json()).toMatchObject({
    noReuse: true,
  })
  expect(
    (
      await harness.request(agentLoginPath('claude'), first, {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(204)
  const absent = await update(first, 'claude', true)
  expect(absent.status).toBe(200)
  expect(await absent.json()).toEqual({ agent: 'claude', connected: false })
  expect(await (await save(first, 'claude', 'api-key')).json()).toMatchObject({
    noReuse: false,
    updatedAt: TEST_TIME + 1000,
  })
})
