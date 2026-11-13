import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { deferred } from '../model-gateway/http.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  connectCodexDevice,
  deviceFixture,
  oauthTokens,
} from './codex-device.test-support'

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

function saveKey(cookie: string): Promise<Response> {
  return harness.request(agentLoginPath('codex'), cookie, {
    method: 'PUT',
    body: JSON.stringify({
      agent: 'codex',
      kind: 'api-key',
      secret: 'replacement-api-key',
    }),
  })
}

async function storedLogin(userId: string) {
  return harness.env.DB.prepare(
    "SELECT * FROM agent_logins WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(userId)
    .first()
}

for (const phase of [
  'before poll',
  'authorization',
  'token exchange',
] as const) {
  it.each(['removal', 'API key', 'newer ChatGPT sign-in'] as const)(
    `ends the earlier sign-in after %s during ${phase} and keeps the current login`,
    async (change) => {
      const fixture = await deviceFixture(harness)
      expect((await saveKey(fixture.cookie)).status).toBe(200)
      await fixture.start()
      fixture.setTime(TEST_TIME + 15_000)
      const entered = deferred<void>()
      const release = deferred<void>()
      fixture.answers.push(
        async () => {
          if (phase === 'authorization') {
            entered.resolve()
            await release.promise
          }
          return Response.json({
            authorization_code: 'private-code',
            code_verifier: 'private-verifier',
            code_challenge: 'challenge',
          })
        },
        async () => {
          if (phase === 'token exchange') {
            entered.resolve()
            await release.promise
          }
          return Response.json(oauthTokens('earlier-sign-in'))
        },
      )
      const poll = phase === 'before poll' ? undefined : fixture.poll()
      try {
        if (poll) await entered.promise
        harness.setTime(TEST_TIME + 10_000)
        const changed =
          change === 'removal'
            ? await harness.request(agentLoginPath('codex'), fixture.cookie, {
                method: 'DELETE',
                body: '{}',
              })
            : change === 'API key'
              ? await saveKey(fixture.cookie)
              : await connectCodexDevice(
                  harness,
                  fixture.cookie,
                  TEST_TIME + 10_000,
                )
        expect(changed.status).toBe(change === 'removal' ? 204 : 200)
        const saved = await storedLogin(fixture.account.user.id)
        release.resolve()
        const failed = {
          state: 'failed',
          cause: 'Your Codex login changed. Get a new code.',
        }
        expect(await (await (poll ?? fixture.poll())).json()).toEqual(failed)
        expect(await (await fixture.poll()).json()).toEqual(failed)
        expect(await storedLogin(fixture.account.user.id)).toEqual(saved)
        expect(fixture.calls).toHaveLength(
          { 'before poll': 1, authorization: 2, 'token exchange': 3 }[phase],
        )
        expect(
          await harness.env.DB.prepare(
            "SELECT state, ciphertext, poll_claim FROM codex_devices WHERE state = 'failed'",
          ).first(),
        ).toEqual({ state: 'failed', ciphertext: null, poll_claim: null })
      } finally {
        release.resolve()
        await Promise.allSettled(poll ? [poll] : [])
      }
    },
  )
}

it('finishes when a save and removal restore the absent login before polling', async () => {
  const fixture = await deviceFixture(harness)
  await fixture.start()
  harness.setTime(TEST_TIME + 1000)
  expect((await saveKey(fixture.cookie)).status).toBe(200)
  expect(
    (
      await harness.request(agentLoginPath('codex'), fixture.cookie, {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(204)
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
})
