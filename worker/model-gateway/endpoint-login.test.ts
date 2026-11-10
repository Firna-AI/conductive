import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { CLAUDE, CODEX, WORKSPACE_ID } from '../chat/harness.test-support'
import { sessionRecord } from '../chat/retry.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayHttp } from './http.test-support'
import { gatewayLogin } from './login'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it.each([CLAUDE, CODEX])(
  'refuses a $agent endpoint login without forwarding it to a native provider',
  async (choice) => {
    const client = await gatewayHttp(harness, choice, 'api-key', 2)
    try {
      const saved = await harness.request(
        agentLoginPath(choice.agent),
        client.fixture.memberCookie,
        {
          method: 'PUT',
          body: JSON.stringify({
            agent: choice.agent,
            kind: 'endpoint',
            endpoint:
              'https://user:password@proxy.example.test/private?key=value',
            secret: 'endpoint-key',
          }),
        },
      )
      expect(saved.status).toBe(200)
      expect(
        await gatewayLogin(
          client.fixture.env,
          WORKSPACE_ID,
          client.fixture.member.id,
          choice.agent,
        ),
      ).toBeNull()
      const response = await client.request()
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({
        error: {
          code: 'agent_login_unavailable',
          message: 'The agent login is not available. Connect it again.',
        },
      })
      expect(client.anthropic.requests).toEqual([])
      expect(client.openai.requests).toEqual([])
      const tab = await client.fixture.tab()
      expect(
        await sessionRecord(client.fixture, client.session.id),
      ).toMatchObject({
        loginAvailable: false,
        loginShared: false,
      })
      await tab.close()
      expect(JSON.stringify(client.runner.received)).not.toMatch(
        /endpoint-key|proxy\.example\.test|password|private\?key=value/,
      )
    } finally {
      await client.dispose()
    }
  },
)
