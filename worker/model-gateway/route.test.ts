import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createApp } from '../application'
import {
  CODEX,
  MACHINE_ORIGIN,
  WORKSPACE_TOKEN,
} from '../chat/harness.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import {
  claudeClientHeaders,
  gatewayHttp,
  gatewayPath,
  expectedWorkspace,
} from './http.test-support'
import { deriveTurnToken } from './token'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('forwards each model route with the starter login of its credential kind', async () => {
  const cases = [
    {
      agent: 'claude',
      kind: 'api-key',
      suffix: '/v1/messages',
      upstream: 'https://api.anthropic.com/v1/messages?beta=true',
      credential: 'x-api-key',
    },
    {
      agent: 'claude',
      kind: 'token',
      suffix: '/v1/messages/count_tokens',
      upstream: 'https://api.anthropic.com/v1/messages/count_tokens?beta=true',
      credential: 'authorization',
    },
    {
      agent: 'codex',
      kind: 'api-key',
      suffix: '/responses',
      upstream: 'https://api.openai.com/v1/responses?beta=true',
      credential: 'authorization',
    },
  ] as const
  for (const item of cases) {
    await harness.reset()
    const client = await gatewayHttp(
      harness,
      item.agent === 'codex' ? CODEX : undefined,
      item.kind,
    )
    try {
      const body =
        ' {"model":"future-model","input":"é", "unknown_field": [1,2]}\n'
      const response = await client.request(
        gatewayPath(item.agent, item.suffix) + '?beta=true',
        {
          body,
          headers: {
            'anthropic-beta':
              item.agent === 'claude'
                ? 'claude-code-20250219,oauth-2025-04-20,oauth-2025-04-20-preview,future-beta'
                : 'oauth-2025-04-20,future-beta',
            originator: 'conductive',
            'session-id': 'session',
            'thread-id': 'thread',
            'x-client-request-id': 'request',
            'x-codex-beta-features': 'features',
            'x-codex-turn-metadata': 'metadata',
            'x-codex-window-id': 'window',
          },
        },
      )
      expect(response.status).toBe(200)
      await response.text()
      const upstream = item.agent === 'codex' ? client.openai : client.anthropic
      expect(upstream.requests).toHaveLength(1)
      const sent = upstream.requests[0]
      expect(sent.url).toBe(item.upstream)
      expect(sent.method).toBe('POST')
      expect(sent.redirect).toBe('manual')
      expect(upstream.bodies).toEqual([body])
      expect(sent.headers.get(item.credential)).toBe(
        item.credential === 'authorization'
          ? `Bearer ${client.secret}`
          : client.secret,
      )
      expect(
        sent.headers.has(
          item.credential === 'authorization' ? 'x-api-key' : 'authorization',
        ),
      ).toBe(false)
      expect(JSON.stringify([...sent.headers])).not.toContain(client.token)
      expect(sent.headers.get('anthropic-beta')).toBe(
        item.agent === 'codex'
          ? 'oauth-2025-04-20,future-beta'
          : item.kind === 'api-key'
            ? 'claude-code-20250219,oauth-2025-04-20-preview,future-beta'
            : 'claude-code-20250219,oauth-2025-04-20,oauth-2025-04-20-preview,future-beta',
      )
      for (const [name, value] of [
        ['originator', 'conductive'],
        ['session-id', 'session'],
        ['thread-id', 'thread'],
        ['x-client-request-id', 'request'],
        ['x-codex-beta-features', 'features'],
        ['x-codex-turn-metadata', 'metadata'],
        ['x-codex-window-id', 'window'],
      ])
        expect(sent.headers.get(name), name).toBe(value)
      expect(client.checks).toEqual([expectedWorkspace])
    } finally {
      await client.dispose()
    }
  }
})

it('refuses unknown paths and methods locally in the selected provider error shape', async () => {
  const client = await gatewayHttp(harness)
  try {
    for (const [agent, suffix, method] of [
      ['claude', '/api/hello', 'HEAD'],
      ['claude', '/v1/models', 'GET'],
      ['claude', '/v1/messages/batches', 'POST'],
      ['claude', '/v1/messages', 'PUT'],
      ['codex', '/responses/compact', 'POST'],
      ['codex', '/models', 'GET'],
      ['codex', '/responses/elsewhere', 'POST'],
    ] as const) {
      const response = await client.request(gatewayPath(agent, suffix), {
        method,
        body: method === 'HEAD' || method === 'GET' ? null : '{}',
      })
      expect(response.status, `${method} ${suffix}`).toBe(404)
      expect(await response.json()).toEqual(
        agent === 'claude'
          ? {
              type: 'error',
              error: {
                type: 'invalid_request_error',
                code: 'model_route_not_found',
                message: 'The model route is not available.',
              },
            }
          : {
              error: {
                type: 'invalid_request_error',
                code: 'model_route_not_found',
                param: null,
                message: 'The model route is not available.',
              },
            },
      )
    }
    expect(client.anthropic.requests).toHaveLength(0)
    expect(client.openai.requests).toHaveLength(0)
    expect(client.checks).toEqual([])
  } finally {
    await client.dispose()
  }
})

it('requires a current matching turn and never accepts a workspace token, cookie, or query credential', async () => {
  const client = await gatewayHttp(harness)
  try {
    for (const credential of ['', WORKSPACE_TOKEN, 'invalid-token']) {
      const response = await client.request(
        gatewayPath('claude') + '?token=not-a-header',
        { headers: { 'x-api-key': credential, Cookie: 'session=fake' } },
      )
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({
        type: 'error',
        error: {
          type: 'authentication_error',
          code: 'turn_token_invalid',
          message: 'The turn token is not valid. Start a new turn.',
        },
      })
    }
    const mismatch = await client.request(gatewayPath('codex'), {
      headers: { Authorization: `Bearer ${client.token}` },
    })
    expect(mismatch.status).toBe(403)
    expect(await mismatch.json()).toEqual({
      error: {
        type: 'invalid_request_error',
        code: 'agent_mismatch',
        param: null,
        message: 'Use the model route for this turn.',
      },
    })
    await client.finish()
    const ended = await client.request()
    expect(ended.status).toBe(409)
    expect(await ended.json()).toEqual({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        code: 'turn_not_active',
        message: 'The turn has ended. Start a new turn.',
      },
    })
    expect(client.anthropic.requests).toHaveLength(0)
    expect(client.openai.requests).toHaveLength(0)
  } finally {
    await client.dispose()
  }
})

it('refuses an unknown workspace before calling its Durable Object', async () => {
  const client = await gatewayHttp(harness)
  try {
    const token = await deriveTurnToken(
      { workspaceId: 'unknown-workspace', turnId: client.turn.turnId },
      { nonce: 'made-up', loginVersion: 0 },
      btoa('f'.repeat(32)),
      { agent: 'claude', kind: 'api-key' },
    )
    const response = await client.request(undefined, {
      headers: { 'x-api-key': token },
    })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      type: 'error',
      error: {
        type: 'authentication_error',
        code: 'turn_token_invalid',
        message: 'The turn token is not valid. Start a new turn.',
      },
    })
    expect(client.workspaceCalls).toEqual([])
    expect(client.workspaceLookups).toEqual(['unknown-workspace'])
    expect(client.checks).toEqual([])
    expect(client.anthropic.requests).toHaveLength(0)
    expect(client.openai.requests).toHaveLength(0)
  } finally {
    await client.dispose()
  }
})

it('mounts the gateway only on the machine surface before runner routing', async () => {
  const path = gatewayPath('claude')
  const application = createApp()
  const machine = await application.fetch(
    new Request(`${MACHINE_ORIGIN}${path}`, {
      method: 'POST',
      headers: claudeClientHeaders,
    }),
    { ...harness.env, MACHINE_ORIGIN },
  )
  expect(machine.status).toBe(401)
  expect(await machine.json()).toMatchObject({
    type: 'error',
    error: { code: 'turn_token_invalid' },
  })
  const browser = await application.fetch(
    new Request(`${TEST_ORIGIN}${path}`, { method: 'GET' }),
    harness.env,
  )
  expect(browser.status).toBe(501)
  expect(await browser.json()).toEqual({
    surface: 'app',
    status: 'not-implemented',
  })
})
