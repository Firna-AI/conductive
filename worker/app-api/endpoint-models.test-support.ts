import {
  ACCOUNT_PATHS,
  agentLoginPath,
  refreshAgentLoginModelsPath,
} from '../../src/shared/account'
import type { Agent } from '../../src/shared/agents'
import { readAccount } from '../../src/app/api/read-core'
import { createApp } from '../application'
import { decryptAgentLogin } from '../chat/queries'
import { FakeModelUpstream } from '../test-support/fake-model-upstream'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

export const endpointModels = [
  { agent: 'claude', model: 'test-claude', label: 'Claude', efforts: ['high'] },
  {
    agent: 'claude',
    model: 'other-claude',
    label: 'Other Claude',
    efforts: ['high'],
  },
  { agent: 'codex', model: 'test-codex', label: 'Codex', efforts: ['medium'] },
  {
    agent: 'codex',
    model: 'other-codex',
    label: 'Other Codex',
    efforts: ['medium'],
  },
]

export function endpointModelApi(harness: TestHarness) {
  let now = TEST_TIME
  const upstream = new FakeModelUpstream(
    'https://proxy.example.test:8443',
    ['/private/models', '/private/v1/models'],
    () =>
      Response.json({
        data: [
          { id: 'test-claude' },
          { id: 'test-codex' },
          { id: 'extra-model' },
        ],
      }),
    'GET',
  )
  harness.env.CONDUCTIVE_MODELS = JSON.stringify(endpointModels)
  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify({
    agent: 'claude',
    model: 'test-claude',
    effort: 'high',
    fast: false,
  })
  const app = createApp({
    now: () => now,
    randomToken: () => 'unused',
    fetch: (request) =>
      new URL(request.url).hostname === 'proxy.example.test'
        ? upstream.fetch(request)
        : harness.github.fetch(request),
  })
  const request = (path: string, cookie: string, init: RequestInit = {}) =>
    app.fetch(
      new Request(`${TEST_ORIGIN}${path}`, {
        ...init,
        headers: {
          Cookie: cookie,
          Origin: TEST_ORIGIN,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      }),
      harness.env,
    )
  return {
    upstream,
    request,
    save: (
      cookie: string,
      agent: Agent = 'claude',
      secret = 'fake-key',
      endpoint = 'https://proxy.example.test:8443/private/v1?key=address-secret',
    ) =>
      request(agentLoginPath(agent), cookie, {
        method: 'PUT',
        body: JSON.stringify({
          agent,
          kind: 'endpoint',
          endpoint,
          secret,
        }),
      }),
    refresh: (cookie: string, agent: Agent = 'claude') =>
      request(refreshAgentLoginModelsPath(agent), cookie, {
        method: 'POST',
        body: '{}',
      }),
    account: async (cookie: string) =>
      readAccount(await (await request(ACCOUNT_PATHS.account, cookie)).json()),
    setTime: (value: number) => {
      now = value
      harness.setTime(value)
    },
  }
}

export async function savedEndpointLogin(harness: TestHarness, agent: Agent) {
  const row = await harness.env.DB.prepare(
    `SELECT user_id AS userId, ciphertext, endpoint_model_ids AS ids,
     endpoint_models_read_at AS readAt, endpoint_models_attempted_at AS attemptedAt
     FROM agent_logins WHERE agent = ? AND kind = 'endpoint'`,
  )
    .bind(agent)
    .first<{
      userId: string
      ciphertext: string
      ids: string | null
      readAt: number | null
      attemptedAt: number | null
    }>()
  if (!row) throw new Error('The endpoint login was not saved.')
  const login = await decryptAgentLogin(
    harness.env,
    row.userId,
    { agent, kind: 'endpoint' },
    row.ciphertext,
  )
  return { ...row, login }
}
