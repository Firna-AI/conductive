import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX } from '../chat/harness.test-support'
import { codexTestTokens } from '../model-gateway/codex-login.test-support'
import { gatewayHttp } from '../model-gateway/http.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { freshCodexLogin } from './renew'
import { waitForCodexRotation } from './rotation'
import { readCodexConnection } from './token-store'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('reads the committed rotation when recovery completes during its pending-state check', async () => {
  const client = await gatewayHttp(harness, CODEX, 'token', 2)
  let oauthCalls = 0
  const dependencies = {
    now: client.fixture.clock.now,
    wait: async () => {
      throw new Error('The completed recovery needs no wait.')
    },
    fetch: async () => {
      oauthCalls++
      const tokens = codexTestTokens('rotated-access')
      return Response.json({
        access_token: tokens.accessToken,
        id_token: tokens.idToken,
        refresh_token: tokens.refreshToken,
        expires_in: 3600,
      })
    },
  }
  try {
    expect(
      await waitForCodexRotation(
        harness.env,
        client.fixture.member.id,
        client.secret,
        dependencies,
        async () => {
          await freshCodexLogin(
            harness.env,
            client.fixture.member.id,
            dependencies,
            client.tasks,
            client.secret,
          )
          return false
        },
      ),
    ).toMatchObject({
      state: 'rotated',
      tokens: { accessToken: 'rotated-access' },
    })
    expect(oauthCalls).toBe(1)
    expect(
      await readCodexConnection(harness.env.DB, client.fixture.member.id),
    ).toMatchObject({ refreshClaim: null, failureCause: null })
  } finally {
    await client.dispose()
  }
})
