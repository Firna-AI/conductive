import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX } from '../chat/harness.test-support'
import { freshCodexLogin } from '../codex-auth/renew'
import { readCodexConnection } from '../codex-auth/token-store'
import { createHarness, type TestHarness } from '../test-support/harness'
import { codexTestTokens } from './codex-login.test-support'
import { deferred, gatewayHttp, gatewayPath } from './http.test-support'
import { codexTokenPaths } from './paths'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('keeps the recovery pending until renewal finishes when its owning request disconnects before the D1 claim', async () => {
  const ownerEntered = deferred<void>(),
    ownerRelease = deferred<void>(),
    oauthEntered = deferred<void>()
  const waiting = deferred<void>(),
    waitingAgain = deferred<void>(),
    firstWaitRelease = deferred<void>(),
    finalWaitRelease = deferred<void>()
  let waits = 0,
    oauthCalls = 0
  const client = await gatewayHttp(
    harness,
    CODEX,
    'token',
    2,
    async (request) => {
      if (new URL(request.url).pathname === '/oauth/token') {
        oauthCalls++
        oauthEntered.resolve()
        const tokens = codexTestTokens('rotated-access')
        return Response.json({
          access_token: tokens.accessToken,
          id_token: tokens.idToken,
          refresh_token: tokens.refreshToken,
          expires_in: 3600,
        })
      }
      return request.headers.get('authorization') === 'Bearer rotated-access'
        ? Response.json({ models: [] })
        : new Response(null, { status: 401 })
    },
    {
      beforeRenew: async () => {
        ownerEntered.resolve()
        await ownerRelease.promise
      },
      wait: async () => {
        if (++waits === 1) {
          waiting.resolve()
          await firstWaitRelease.promise
        } else {
          waitingAgain.resolve()
          await finalWaitRelease.promise
        }
      },
    },
  )
  const controller = new AbortController()
  const request = (signal?: AbortSignal) =>
    client.request(gatewayPath('codex', codexTokenPaths.models), {
      method: 'GET',
      body: null,
      signal,
    })
  const first = request(controller.signal)
  await ownerEntered.promise
  const second = request()
  try {
    await waiting.promise
    controller.abort()
    expect((await first).status).toBe(502)
    firstWaitRelease.resolve()
    expect(
      await Promise.race([
        waitingAgain.promise.then(() => ({ state: 'waiting' })),
        second.then((response) => ({
          state: 'answer',
          status: response.status,
        })),
      ]),
    ).toEqual({ state: 'waiting' })
    ownerRelease.resolve()
    await oauthEntered.promise
    expect(
      await freshCodexLogin(
        harness.env,
        client.fixture.member.id,
        {
          now: client.fixture.clock.now,
          fetch: async () => {
            throw new Error('A second refresh is not allowed.')
          },
        },
        client.tasks,
      ),
    ).toMatchObject({ accessToken: 'rotated-access' })
    finalWaitRelease.resolve()
    const response = await second
    expect(response.status).toBe(200)
    await response.text()
    expect(oauthCalls).toBe(1)
    expect(
      await readCodexConnection(harness.env.DB, client.fixture.member.id),
    ).toMatchObject({ refreshClaim: null, failureCause: null })
  } finally {
    ownerRelease.resolve()
    firstWaitRelease.resolve()
    finalWaitRelease.resolve()
    await Promise.allSettled([first, second])
    await client.dispose()
  }
})
