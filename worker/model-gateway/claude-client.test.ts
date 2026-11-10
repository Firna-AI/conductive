import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { MACHINE_ORIGIN } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayHttp, gatewayPath } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('refuses missing or partial Claude markers before workspace access, turn checks, or upstream calls', async () => {
  const client = await gatewayHttp(harness, undefined, 'token')
  const cases: { name: string; markers: Record<string, string> }[] = [
    {
      name: 'keyless SDK',
      markers: {
        'anthropic-beta': 'oauth-2025-04-20',
        'user-agent': 'Anthropic/JS 1.6.0',
      },
    },
    {
      name: 'missing beta',
      markers: { 'user-agent': 'claude-cli/2.1.318' },
    },
    {
      name: 'missing user agent',
      markers: { 'anthropic-beta': 'claude-code-20250219' },
    },
    {
      name: 'partial beta tokens',
      markers: {
        'anthropic-beta': 'prefix-claude-code-20250219,claude-code-202502190',
        'user-agent': 'claude-cli/2.1.318',
      },
    },
    {
      name: 'partial user agent',
      markers: {
        'anthropic-beta': 'claude-code-20250219',
        'user-agent': 'prefix-claude-cli/2.1.318',
        'x-app': 'cli',
        'x-claude-code-future': 'present',
      },
    },
  ]
  try {
    for (const { name, markers } of cases) {
      const response = await client.fetch(
        new Request(`${MACHINE_ORIGIN}${gatewayPath('claude')}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${client.token}`, ...markers },
          body: '{}',
        }),
      )
      expect(response.status, name).toBe(403)
      expect(await response.json(), name).toEqual({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          code: 'model_client_not_allowed',
          message: 'Use Claude for model requests on this route.',
        },
      })
      expect(client.workspaceLookups, name).toEqual([])
      expect(client.workspaceCalls, name).toEqual([])
      expect(client.checks, name).toEqual([])
      expect(client.anthropic.requests, name).toHaveLength(0)
      expect(client.openai.requests, name).toHaveLength(0)
    }
  } finally {
    await client.dispose()
  }
})
