import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { saveAccountLogin } from '../app-api/account-data'
import { CODEX, WORKSPACE_ID } from '../chat/harness.test-support'
import { agentLoginContext } from '../chat/queries'
import { fakeCodexTasks } from '../codex-auth/tasks.test-support'
import { readCodexConnection } from '../codex-auth/token-store'
import { parseCodexTokens } from '../codex-auth/tokens'
import { decrypt, encrypt } from '../security/crypto'
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

it.each(['expiry', '401', 'before-claim'] as const)(
  'retains the %s renewal and commit after the gateway request disconnects',
  async (mode) => {
    const retained = fakeCodexTasks()
    const entered = deferred<void>(),
      release = deferred<void>()
    let oauthCalls = 0,
      modelCalls = 0
    const client = await gatewayHttp(
      harness,
      CODEX,
      'token',
      2,
      async (request) => {
        if (new URL(request.url).pathname === '/oauth/token') {
          oauthCalls++
          if (mode !== 'before-claim') {
            entered.resolve()
            await release.promise
          }
          const tokens = codexTestTokens('rotated-after-disconnect')
          return Response.json({
            access_token: tokens.accessToken,
            id_token: tokens.idToken,
            refresh_token: 'rotated-refresh-after-disconnect',
            expires_in: 3600,
          })
        }
        modelCalls++
        return new Response(null, { status: 401 })
      },
      {
        tasks: retained.owner,
        beforeRenew:
          mode === 'before-claim'
            ? async () => {
                entered.resolve()
                await release.promise
              }
            : undefined,
      },
    )
    if (mode === 'expiry')
      await saveAccountLogin(
        harness.env.DB,
        client.fixture.member.id,
        'codex',
        'token',
        await encrypt(
          JSON.stringify({
            ...codexTestTokens(client.secret),
            expiresAt: client.fixture.clock.now() + 30_000,
          }),
          agentLoginContext(client.fixture.member.id, 'codex'),
          harness.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
        client.fixture.clock.now(),
      )
    const controller = new AbortController()
    const request = client.request(
      gatewayPath('codex', codexTokenPaths.models),
      { method: 'GET', body: null, signal: controller.signal },
    )
    try {
      await entered.promise
      controller.abort()
      const response = await request
      expect(response.status).toBe(502)
      await response.text()
      expect(retained.active.size).toBeGreaterThan(0)
      release.resolve()
      await retained.drain()
      const connection = await readCodexConnection(
        harness.env.DB,
        client.fixture.member.id,
      )
      expect(connection).toMatchObject({
        refreshClaim: null,
        failureCause: null,
      })
      if (!connection) throw new Error('The renewed login is missing.')
      expect(
        parseCodexTokens(
          await decrypt(
            connection.ciphertext,
            agentLoginContext(client.fixture.member.id, 'codex'),
            harness.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
        ),
      ).toMatchObject({
        accessToken: 'rotated-after-disconnect',
        refreshToken: 'rotated-refresh-after-disconnect',
      })
      const turn = await client.fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(client.turn.turnId),
      )
      expect(turn?.gateway?.codexRecoveryPending ?? false).toBe(false)
      expect(turn?.gateway?.codexRecoveryUsed ?? false).toBe(mode !== 'expiry')
      expect(oauthCalls).toBe(1)
      expect(modelCalls).toBe(mode !== 'expiry' ? 1 : 0)
    } finally {
      release.resolve()
      await Promise.allSettled([request])
      await retained.drain()
      await client.dispose()
    }
  },
)

it('retains the terminal failure write after its gateway request disconnects', async () => {
  const retained = fakeCodexTasks()
  const entered = deferred<void>(),
    release = deferred<void>()
  const client = await gatewayHttp(
    harness,
    CODEX,
    'token',
    2,
    async (request) => {
      if (new URL(request.url).pathname === '/oauth/token') {
        const tokens = codexTestTokens('terminal-access')
        return Response.json({
          access_token: tokens.accessToken,
          id_token: tokens.idToken,
          refresh_token: tokens.refreshToken,
          expires_in: 3600,
        })
      }
      return new Response(null, { status: 401 })
    },
    {
      tasks: retained.owner,
      beforeFailure: async () => {
        entered.resolve()
        await release.promise
      },
    },
  )
  const controller = new AbortController()
  const request = client.request(gatewayPath('codex', codexTokenPaths.models), {
    method: 'GET',
    body: null,
    signal: controller.signal,
  })
  try {
    await entered.promise
    controller.abort()
    const response = await request
    expect(response.status).toBe(502)
    await response.text()
    expect(retained.active.size).toBeGreaterThan(0)
    release.resolve()
    await retained.drain()
    expect(
      await readCodexConnection(harness.env.DB, client.fixture.member.id),
    ).toMatchObject({
      failureCause: 'ChatGPT access expired.',
      refreshClaim: null,
    })
  } finally {
    release.resolve()
    await Promise.allSettled([request])
    await retained.drain()
    await client.dispose()
  }
})
