import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { ACCOUNT_PATHS } from '../../src/shared/account'
import { saveAccountLogin } from '../app-api/account-data'
import { CODEX, WORKSPACE_ID } from '../chat/harness.test-support'
import { agentLoginContext } from '../chat/queries'
import { failCodexAccessToken } from '../codex-auth/failure'
import { encrypt } from '../security/crypto'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { codexAccount, codexTestTokens } from './codex-login.test-support'
import { accountPath, accounts, modelPath } from './codex-token.test-support'
import { gatewayHttp, gatewayPath } from './http.test-support'
import { codexTokenPaths } from './paths'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify(CODEX)
})
afterAll(() => harness.dispose())

function refreshed() {
  const fresh = codexTestTokens('rotated-access')
  return Response.json({
    access_token: fresh.accessToken,
    refresh_token: fresh.refreshToken,
    id_token: fresh.idToken,
    expires_in: 3600,
  })
}

function accountReply() {
  const reply = accounts('NO_CONSTRAINT')
  return Response.json({
    accounts: [{ ...reply.accounts[0], id: codexAccount.accountId }],
  })
}

it('makes a terminal metadata or model 401 visible as an unusable login in Account', async () => {
  for (const mode of ['metadata', 'model', 'renewal-failure'] as const) {
    await harness.reset()
    harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify(CODEX)
    let oauthCalls = 0
    const client = await gatewayHttp(
      harness,
      CODEX,
      'token',
      2,
      async (request) => {
        if (new URL(request.url).pathname === '/oauth/token') {
          oauthCalls++
          return mode === 'renewal-failure'
            ? new Response(null, { status: 401 })
            : refreshed()
        }
        if (
          mode !== 'metadata' &&
          new URL(request.url).pathname === accountPath
        )
          return accountReply()
        return new Response(null, { status: 401 })
      },
    )
    const path = gatewayPath(
      'codex',
      mode === 'metadata' ? codexTokenPaths.models : modelPath,
    )
    const init =
      mode === 'metadata'
        ? { method: 'GET', body: null }
        : { method: 'POST', body: '{}' }
    try {
      if (mode === 'model') {
        const first = await client.request(path, init)
        expect(first.status).toBe(502)
        await first.text()
      }
      const terminal = await client.request(path, init)
      const storedTurn = await client.fixture.chat.store.read(
        WORKSPACE_ID,
        (view) => view.turn(client.turn.turnId),
      )
      expect(
        terminal.status,
        JSON.stringify({ mode, gateway: storedTurn?.gateway }),
      ).toBe(403)
      expect(await terminal.json()).toMatchObject({
        error: {
          code: 'agent_login_unavailable',
          message: 'ChatGPT access expired.',
        },
      })
      const account = await harness.request(
        ACCOUNT_PATHS.account,
        client.fixture.memberCookie,
      )
      expect(account.status).toBe(200)
      expect(await account.json()).toMatchObject({
        agentLogins: [
          { agent: 'claude', connected: true },
          {
            agent: 'codex',
            connected: true,
            kind: 'token',
            unusableCause: 'ChatGPT access expired.',
          },
        ],
      })
      expect(oauthCalls).toBe(1)
    } finally {
      await client.dispose()
    }
  }
})

it('does not mark a newer sign-in unusable when an old model response finally returns 401', async () => {
  let modelCalls = 0
  let replace = async () => {}
  const client = await gatewayHttp(
    harness,
    CODEX,
    'token',
    2,
    async (request) => {
      const path = new URL(request.url).pathname
      if (path === '/oauth/token') return refreshed()
      if (path === accountPath) return accountReply()
      modelCalls++
      if (modelCalls === 2) await replace()
      return new Response(null, { status: 401 })
    },
  )
  replace = async () => {
    await saveAccountLogin(
      harness.env.DB,
      client.fixture.member.id,
      'codex',
      'token',
      await encrypt(
        JSON.stringify(codexTestTokens('new-sign-in')),
        agentLoginContext(client.fixture.member.id, 'codex'),
        harness.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
      TEST_TIME + 1,
    )
  }
  try {
    const first = await client.request(gatewayPath('codex', modelPath))
    expect(first.status).toBe(502)
    await first.text()
    const terminal = await client.request(gatewayPath('codex', modelPath))
    const storedTurn = await client.fixture.chat.store.read(
      WORKSPACE_ID,
      (view) => view.turn(client.turn.turnId),
    )
    expect(
      terminal.status,
      JSON.stringify({ gateway: storedTurn?.gateway }),
    ).toBe(403)
    await terminal.text()
    await failCodexAccessToken(
      harness.env,
      client.fixture.member.id,
      'rotated-access',
    )
    const account = await harness.request(
      ACCOUNT_PATHS.account,
      client.fixture.memberCookie,
    )
    expect(account.status).toBe(200)
    expect(await account.json()).toMatchObject({
      agentLogins: [
        { agent: 'claude', connected: true },
        {
          agent: 'codex',
          connected: true,
          kind: 'token',
          updatedAt: TEST_TIME + 1,
        },
      ],
    })
    expect(
      await harness.env.DB.prepare(
        "SELECT failure_cause FROM agent_logins WHERE user_id = ? AND agent = 'codex'",
      )
        .bind(client.fixture.member.id)
        .first(),
    ).toEqual({ failure_cause: null })
  } finally {
    await client.dispose()
  }
})
