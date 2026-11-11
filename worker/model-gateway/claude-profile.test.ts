import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_ORIGIN } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  claudeClientHeaders,
  expectedWorkspace,
  gatewayHttp,
  gatewayPath,
} from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('forwards bearer profile requests for both Claude login kinds with unchanged body bytes', async () => {
  const beta =
    'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,prompt-caching-scope-2026-01-05,thinking-token-count-2026-05-13,advanced-tool-use-2025-11-20,effort-2025-11-24,cache-diagnosis-2026-04-07'
  const apiKeyBeta =
    'claude-code-20250219,interleaved-thinking-2025-05-14,context-management-2025-06-27,prompt-caching-scope-2026-01-05,thinking-token-count-2026-05-13,advanced-tool-use-2025-11-20,effort-2025-11-24,cache-diagnosis-2026-04-07'
  const body = new TextEncoder().encode(
    ' {\n "model":"future-model", "system":[{"type":"text","text":"é💡","cache_control":{"type":"ephemeral","scope":"global"}}], "diagnostics":{"cache":true}, "messages":[], "future_field": [1, 2]\n}\n',
  )
  for (const [kind, userAgent, expectedBeta, credential] of [
    ['api-key', claudeClientHeaders['user-agent'], apiKeyBeta, 'x-api-key'],
    [
      'token',
      'claude-cli/99.0.0 (external, sdk-ts, agent-sdk/99.0.0)',
      beta,
      'authorization',
    ],
  ] as const) {
    await harness.reset()
    const client = await gatewayHttp(harness, undefined, kind)
    const bodies: Uint8Array[] = []
    client.anthropic.responseFactories.push(async (request) => {
      bodies.push(new Uint8Array(await request.arrayBuffer()))
      return new Response('accepted')
    })
    const request = (token: string) =>
      client.fetch(
        new Request(`${MACHINE_ORIGIN}${gatewayPath('claude')}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
            'anthropic-beta': beta,
            'user-agent': userAgent,
          },
          body,
        }),
      )
    try {
      const response = await request(client.token)
      expect(response.status, kind).toBe(200)
      expect(await response.text()).toBe('accepted')
      expect(client.anthropic.requests).toHaveLength(1)
      const sent = client.anthropic.requests[0]
      expect(bodies).toEqual([body])
      expect(sent.headers.get(credential)).toBe(
        credential === 'authorization'
          ? `Bearer ${client.secret}`
          : client.secret,
      )
      expect(
        sent.headers.has(
          credential === 'authorization' ? 'x-api-key' : 'authorization',
        ),
      ).toBe(false)
      expect(sent.headers.get('anthropic-beta')).toBe(expectedBeta)
      expect(sent.headers.get('user-agent')).toBe(userAgent)
      expect(JSON.stringify([...sent.headers])).not.toContain(client.token)
      expect(client.checks).toEqual([expectedWorkspace])

      const changedPrefix =
        kind === 'api-key'
          ? client.token.replace('sk-ant-api-', 'sk-ant-oat01-')
          : client.token.replace('sk-ant-oat01-', 'sk-ant-api-')
      const refused = await request(changedPrefix)
      expect(refused.status).toBe(401)
      expect(await refused.json()).toEqual({
        type: 'error',
        error: {
          type: 'authentication_error',
          code: 'turn_token_invalid',
          message: 'The turn token is not valid. Start a new turn.',
        },
      })
      expect(client.anthropic.requests).toHaveLength(1)
      expect(client.openai.requests).toHaveLength(0)
    } finally {
      await client.dispose()
    }
  }
})
