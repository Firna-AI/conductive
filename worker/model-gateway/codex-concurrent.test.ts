import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX } from '../chat/harness.test-support'
import { failCodexAccessToken } from '../codex-auth/failure'
import { freshCodexLogin } from '../codex-auth/renew'
import { readCodexConnection } from '../codex-auth/token-store'
import { createHarness, type TestHarness } from '../test-support/harness'
import { codexAccount, codexTestTokens } from './codex-login.test-support'
import { accountPath, accounts, modelPath } from './codex-token.test-support'
import { deferred, gatewayHttp, gatewayPath } from './http.test-support'
import { codexTokenPaths } from './paths'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

function rotatedReply() {
  const tokens = codexTestTokens('rotated-access')
  return Response.json({
    access_token: tokens.accessToken,
    id_token: tokens.idToken,
    refresh_token: tokens.refreshToken,
    expires_in: 3600,
  })
}

function accountReply() {
  return Response.json({
    accounts: [
      { ...accounts('NO_CONSTRAINT').accounts[0], id: codexAccount.accountId },
    ],
  })
}

it('joins concurrent GET and POST 401s before and after the winning request takes its D1 claim', async () => {
  for (const window of ['before-claim', 'oauth-in-flight'] as const) {
    for (const method of ['GET', 'POST'] as const) {
      await harness.reset()
      const ownerEntered = deferred<void>(),
        ownerRelease = deferred<void>()
      const waiting = deferred<void>(),
        waitRelease = deferred<void>(),
        bothRejected = deferred<void>()
      let rejected = 0,
        oauthCalls = 0
      const client = await gatewayHttp(
        harness,
        CODEX,
        'token',
        2,
        async (request) => {
          const path = new URL(request.url).pathname
          if (path === '/oauth/token') {
            oauthCalls++
            if (window === 'oauth-in-flight') {
              ownerEntered.resolve()
              await ownerRelease.promise
            }
            return rotatedReply()
          }
          if (path === accountPath) return accountReply()
          if (request.headers.get('authorization') === 'Bearer rotated-access')
            return Response.json({ output: [] })
          if (++rejected === 2) bothRejected.resolve()
          await bothRejected.promise
          return new Response(null, { status: 401 })
        },
        {
          beforeRenew:
            window === 'before-claim'
              ? async () => {
                  ownerEntered.resolve()
                  await ownerRelease.promise
                }
              : undefined,
          wait: async () => {
            waiting.resolve()
            await waitRelease.promise
          },
        },
      )
      const path = gatewayPath(
        'codex',
        method === 'GET' ? codexTokenPaths.models : modelPath,
      )
      const init = { method, body: method === 'POST' ? '{}' : null }
      const first = client.request(path, init),
        second = client.request(path, init)
      try {
        await ownerEntered.promise
        const observed = await Promise.race([
          waiting.promise.then(() => ({ state: 'waiting' })),
          first.then((response) => ({
            state: 'answer',
            status: response.status,
          })),
          second.then((response) => ({
            state: 'answer',
            status: response.status,
          })),
        ])
        expect(observed, `${window} ${method}`).toEqual({ state: 'waiting' })
        ownerRelease.resolve()
        await Promise.race([first, second])
        waitRelease.resolve()
        const responses = await Promise.all([first, second])
        expect(responses.map((response) => response.status)).toEqual(
          method === 'GET' ? [200, 200] : [502, 502],
        )
        for (const response of responses) await response.text()
        expect(oauthCalls).toBe(1)
        const connection = await readCodexConnection(
          harness.env.DB,
          client.fixture.member.id,
        )
        expect(connection).toMatchObject({
          refreshClaim: null,
          failureCause: null,
        })
        expect(
          await freshCodexLogin(harness.env, client.fixture.member.id, {
            now: client.fixture.clock.now,
            fetch: async () => {
              throw new Error('A second refresh is not allowed.')
            },
          }),
        ).toMatchObject({ accessToken: 'rotated-access' })
      } finally {
        ownerRelease.resolve()
        waitRelease.resolve()
        bothRejected.resolve()
        await Promise.allSettled([first, second])
        await client.dispose()
      }
    }
  }
})

it('leaves a live D1 refresh claim intact when a terminal 401 failure writer runs', async () => {
  const client = await gatewayHttp(harness, CODEX, 'token', 2)
  const entered = deferred<void>(),
    release = deferred<void>()
  const refreshing = freshCodexLogin(
    harness.env,
    client.fixture.member.id,
    {
      now: client.fixture.clock.now,
      fetch: async () => {
        entered.resolve()
        await release.promise
        return rotatedReply()
      },
    },
    client.secret,
  )
  try {
    await entered.promise
    const claimed = await readCodexConnection(
      harness.env.DB,
      client.fixture.member.id,
    )
    expect(claimed?.refreshClaim).toEqual(expect.any(String))
    await failCodexAccessToken(
      harness.env,
      client.fixture.member.id,
      client.secret,
    )
    expect(
      await readCodexConnection(harness.env.DB, client.fixture.member.id),
    ).toEqual(claimed)
    release.resolve()
    expect(await refreshing).toMatchObject({ accessToken: 'rotated-access' })
    expect(
      await readCodexConnection(harness.env.DB, client.fixture.member.id),
    ).toMatchObject({ refreshClaim: null, failureCause: null })
  } finally {
    release.resolve()
    await Promise.allSettled([refreshing])
    await client.dispose()
  }
})

it('returns retryable 502 after a bounded wait while the winning recovery still runs', async () => {
  for (const window of ['before-claim', 'oauth-in-flight'] as const) {
    await harness.reset()
    const entered = deferred<void>(),
      release = deferred<void>(),
      bothRejected = deferred<void>()
    let rejected = 0,
      oauthCalls = 0,
      waited = 0
    const client = await gatewayHttp(
      harness,
      CODEX,
      'token',
      2,
      async (request) => {
        if (new URL(request.url).pathname === '/oauth/token') {
          oauthCalls++
          if (window === 'oauth-in-flight') {
            entered.resolve()
            await release.promise
          }
          return rotatedReply()
        }
        if (request.headers.get('authorization') === 'Bearer rotated-access')
          return Response.json({ models: [] })
        if (++rejected === 2) bothRejected.resolve()
        await bothRejected.promise
        return new Response(null, { status: 401 })
      },
      {
        beforeRenew:
          window === 'before-claim'
            ? async () => {
                entered.resolve()
                await release.promise
              }
            : undefined,
        wait: async (milliseconds) => {
          waited += milliseconds
          await client.fixture.clock.advance(milliseconds)
        },
      },
    )
    const request = () =>
      client.request(gatewayPath('codex', codexTokenPaths.models), {
        method: 'GET',
        body: null,
      })
    const first = request(),
      second = request()
    try {
      await entered.promise
      const pending = await Promise.race([first, second])
      expect(pending.status, window).toBe(502)
      expect(await pending.json()).toMatchObject({
        error: { code: 'model_upstream_unavailable' },
      })
      expect(waited).toBe(5000)
      expect(
        await readCodexConnection(harness.env.DB, client.fixture.member.id),
      ).toMatchObject({ failureCause: null })
      release.resolve()
      const responses = await Promise.all([first, second])
      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 502,
      ])
      expect(oauthCalls).toBe(1)
      expect(
        await readCodexConnection(harness.env.DB, client.fixture.member.id),
      ).toMatchObject({ refreshClaim: null, failureCause: null })
    } finally {
      release.resolve()
      bothRejected.resolve()
      await Promise.allSettled([first, second])
      await client.dispose()
    }
  }
})
