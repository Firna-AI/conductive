import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS, agentLoginPath } from '../../src/shared/account'
import { jwt, oauthTokens } from '../app-api/codex-device.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { freshCodexLogin } from './renew'
import { barrier, savedLogin } from './renew.test-support'

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
afterAll(async () => harness.dispose())

it('serializes renewal across Worker instances and commits rotation before returning the access token', async () => {
  const fixture = await savedLogin(harness)
  const entered = barrier(),
    respond = barrier(),
    waiting = barrier(),
    committed = barrier()
  fixture.answers.push(async () => {
    entered.release()
    await respond.promise
    return Response.json(oauthTokens('new'))
  })
  const first = freshCodexLogin(
    harness.env,
    fixture.account.user.id,
    fixture.dependencies,
    fixture.tasks,
  )
  const firstStored = first.then(async (tokens) => {
    try {
      const stored = await fixture.read()
      expect(stored.tokens).toEqual(tokens)
      expect(stored.refresh_claim).toBeNull()
      expect(stored.updated_at).toBe(TEST_TIME)
      return tokens
    } finally {
      committed.release()
    }
  })
  await entered.promise
  const otherEnv = { ...harness.env, DB: new Proxy(harness.env.DB, {}) }
  const second = freshCodexLogin(
    otherEnv,
    fixture.account.user.id,
    {
      ...fixture.dependencies,
      wait: async () => {
        waiting.release()
        await committed.promise
      },
    },
    fixture.tasks,
  )
  await waiting.promise
  respond.release()
  const [secondTokens, firstTokens] = await Promise.all([second, firstStored])
  expect(secondTokens).toEqual(firstTokens)
  expect(fixture.calls).toHaveLength(1)
  expect(await fixture.calls[0].json()).toEqual({
    grant_type: 'refresh_token',
    client_id: 'app_EMoamEEZ73f0CkXaXp7hrann',
    refresh_token: 'refresh-old',
  })
  expect((await fixture.read()).tokens?.refreshToken).toBe('refresh-new')
})

it('renews one rejected access token once and lets overlapping 401 requests use the committed rotation', async () => {
  const fixture = await savedLogin(harness, TEST_TIME + 3_600_000)
  expect(
    await freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
    ),
  ).toEqual(fixture.old)
  expect(fixture.calls).toHaveLength(0)
  fixture.answers.push(Response.json(oauthTokens('forced')))
  const results = await Promise.all([
    freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
      fixture.old.accessToken,
    ),
    freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
      fixture.old.accessToken,
    ),
  ])
  expect(results[0]).toEqual(results[1])
  expect(results[0].refreshToken).toBe('refresh-forced')
  expect(
    await freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
      fixture.old.accessToken,
    ),
  ).toEqual(results[0])
  expect(fixture.calls).toHaveLength(1)
  fixture.answers.push(
    Response.json({ access_token: 'opaque-access-token', expires_in: 3600 }),
  )
  const minimalPromise = freshCodexLogin(
    harness.env,
    fixture.account.user.id,
    fixture.dependencies,
    fixture.tasks,
    results[0].accessToken,
  )
  await expect(minimalPromise).resolves.toEqual({
    ...results[0],
    accessToken: 'opaque-access-token',
  })
  const minimal = await minimalPromise
  expect((await fixture.read()).tokens).toEqual(minimal)
  expect(fixture.calls).toHaveLength(2)
})

it('marks a refused renewal unusable and reconnect clears its failure and claim', async () => {
  const fixture = await savedLogin(harness)
  fixture.answers.push(new Response('secret-upstream-token', { status: 401 }))
  await expect(
    freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
    ),
  ).rejects.toMatchObject({
    code: 'codex_reconnect_required',
    status: 401,
    message: 'ChatGPT access expired.',
  })
  expect((await fixture.read()).failure_cause).toBe('ChatGPT access expired.')
  expect(
    await (await harness.request(ACCOUNT_PATHS.account, fixture.cookie)).json(),
  ).toMatchObject({
    agentLogins: [
      { agent: 'claude', connected: false },
      {
        agent: 'codex',
        connected: true,
        unusableCause: 'ChatGPT access expired.',
      },
    ],
  })
  await expect(
    freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
    ),
  ).rejects.toMatchObject({ code: 'codex_reconnect_required' })
  expect(fixture.calls).toHaveLength(1)
  const reconnected = await harness.request(
    agentLoginPath('codex'),
    fixture.cookie,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'codex',
        kind: 'api-key',
        secret: 'api-key',
      }),
    },
  )
  expect(reconnected.status).toBe(200)
  const stored = await harness.env.DB.prepare(
    "SELECT refresh_claim, refresh_claim_until, failure_cause FROM agent_logins WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(fixture.account.user.id)
    .first()
  expect(stored).toEqual({
    refresh_claim: null,
    refresh_claim_until: null,
    failure_cause: null,
  })
})

it('never takes over an abandoned refresh claim or switches the connected account', async () => {
  const fixture = await savedLogin(harness)
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET refresh_claim = 'abandoned', refresh_claim_until = ? WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(TEST_TIME - 1, fixture.account.user.id)
    .run()
  await expect(
    freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
    ),
  ).rejects.toMatchObject({ code: 'codex_reconnect_required' })
  expect((await fixture.read()).failure_cause).toBe('ChatGPT access expired.')
  expect(fixture.calls).toHaveLength(0)
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET refresh_claim = NULL, refresh_claim_until = NULL, failure_cause = NULL WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(fixture.account.user.id)
    .run()
  fixture.answers.push(
    Response.json({
      ...oauthTokens('other'),
      id_token: jwt({
        'https://api.openai.com/auth': { chatgpt_account_id: 'other-account' },
      }),
    }),
  )
  await expect(
    freshCodexLogin(
      harness.env,
      fixture.account.user.id,
      fixture.dependencies,
      fixture.tasks,
    ),
  ).rejects.toMatchObject({ code: 'codex_reconnect_required' })
  expect((await fixture.read()).tokens).toEqual(fixture.old)
  expect((await fixture.read()).failure_cause).toBe('ChatGPT access expired.')
})
