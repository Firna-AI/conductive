import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import { fakeCodexTasks } from '../codex-auth/tasks.test-support'
import { deferred } from '../model-gateway/http.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { deviceFixture, oauthTokens } from './codex-device.test-support'

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
  })
})
afterAll(() => harness.dispose())

it('retains an approved exchange and saves its login after the polling client leaves', async () => {
  const retained = fakeCodexTasks()
  const fixture = await deviceFixture(harness, undefined, retained.owner)
  await fixture.start()
  fixture.setTime(TEST_TIME + 5000)
  const entered = deferred<void>(),
    release = deferred<void>()
  fixture.answers.push(
    Response.json({
      authorization_code: 'private-code',
      code_verifier: 'verifier',
      code_challenge: 'challenge',
    }),
    async () => {
      entered.resolve()
      await release.promise
      return Response.json(oauthTokens('kept-exchange'))
    },
  )
  const poll = fixture.poll()
  const disconnected = deferred<Response>()
  const client = Promise.race([poll, disconnected.promise])
  try {
    await entered.promise
    disconnected.resolve(new Response(null, { status: 499 }))
    expect((await client).status).toBe(499)
    expect(retained.active.size).toBeGreaterThan(0)
    release.resolve()
    await retained.drain()
    const account = await harness.request(ACCOUNT_PATHS.account, fixture.cookie)
    expect(await account.json()).toMatchObject({
      agentLogins: [
        { agent: 'claude', connected: false },
        { agent: 'codex', connected: true, kind: 'token' },
      ],
    })
    expect(
      await harness.env.DB.prepare(
        'SELECT state, ciphertext, poll_claim FROM codex_devices',
      ).first(),
    ).toEqual({
      state: 'connected',
      ciphertext: null,
      poll_claim: null,
    })
    expect(fixture.calls).toHaveLength(3)
    expect(await (await poll).json()).toMatchObject({ state: 'connected' })
  } finally {
    release.resolve()
    await Promise.allSettled([poll])
    await retained.drain()
  }
})
