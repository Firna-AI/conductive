import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { CLAUDE, CODEX } from '../chat/harness.test-support'
import { sessionRecord } from '../chat/retry.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayOwnEndpoint } from './fixture.test-support'
import { gatewayHttp, gatewayPath } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it.each([CLAUDE, CODEX])(
  'forwards $agent endpoint turns with the real key and no endpoint credentials in runner commands',
  async (choice) => {
    const client = await gatewayHttp(harness, choice, 'endpoint', 2)
    try {
      expect(client.turn.credential).toEqual({
        agent: choice.agent,
        kind: 'api-key',
        token: client.token,
        ...(choice.agent === 'claude' ? { promptCacheTtl: '1h' } : {}),
      })
      const response = await client.request(
        `${gatewayPath(choice.agent)}?trace=request`,
        {
          headers: {
            'anthropic-beta':
              'claude-code-20250219,oauth-2025-04-20,prompt-caching-scope-2026-01-05',
            cookie: 'private',
            'x-private': 'private',
          },
        },
      )
      expect(response.status).toBe(200)
      await response.text()
      expect(client.ownEndpoint.requests).toHaveLength(1)
      const request = client.ownEndpoint.requests[0]
      expect(request.url).toBe(
        choice.agent === 'claude'
          ? 'https://proxy.example.test:8443/private/v1/messages?key=value&trace=request'
          : 'https://proxy.example.test:8443/private/v1/responses?key=value&trace=request',
      )
      expect(request.redirect).toBe('manual')
      expect(
        request.headers.get(
          choice.agent === 'claude' ? 'x-api-key' : 'authorization',
        ),
      ).toBe(
        choice.agent === 'claude' ? client.secret : `Bearer ${client.secret}`,
      )
      expect(
        request.headers.get(
          choice.agent === 'claude' ? 'authorization' : 'x-api-key',
        ),
      ).toBeNull()
      expect(request.headers.get('cookie')).toBeNull()
      expect(request.headers.get('x-private')).toBeNull()
      expect(client.ownEndpoint.bodies).toEqual([
        '{"model":"unfiltered-model","stream":true}',
      ])
      expect(client.anthropic.requests).toEqual([])
      expect(client.openai.requests).toEqual([])
      await client.fixture.send(
        client.session.id,
        'follow-up',
        client.fixture.ownerCookie,
        choice,
      )
      expect(client.runner.commands.at(-1)).toMatchObject({ type: 'message' })
      expect(JSON.stringify(client.runner.received)).not.toMatch(
        /secret-|proxy\.example\.test|private\/v1|key=value|endpoint/,
      )
      expect(
        JSON.stringify([...(await client.fixture.snapshot()).records]),
      ).not.toContain(gatewayOwnEndpoint)
      const tab = await client.fixture.tab()
      expect(
        await sessionRecord(client.fixture, client.session.id),
      ).toMatchObject({ loginAvailable: true, loginShared: true })
      await tab.close()
      const privateLogin = await harness.request(
        agentLoginPath(choice.agent),
        client.fixture.memberCookie,
        {
          method: 'PATCH',
          body: JSON.stringify({ noReuse: true }),
        },
      )
      expect(privateLogin.status).toBe(200)
      const linked = await client.fixture.send(
        client.session.id,
        'private-login',
        client.fixture.ownerCookie,
        choice,
      )
      expect(linked.session).toMatchObject({
        sourceSessionId: client.session.id,
        startedBy: { id: client.fixture.owner.id },
      })
      expect(client.runner.commands.at(-1)).toMatchObject({
        type: 'turn',
        sessionId: linked.session.id,
      })
      const own = await client.fixture.send(
        client.session.id,
        'private-starter',
        client.fixture.memberCookie,
        choice,
      )
      expect(own.session.id).toBe(client.session.id)
      expect(client.runner.commands.at(-1)).toMatchObject({
        type: 'message',
        sessionId: client.session.id,
      })
      expect(JSON.stringify(client.runner.received)).not.toMatch(
        /secret-|proxy\.example\.test|private\/v1|key=value|endpoint/,
      )
    } finally {
      await client.dispose()
    }
  },
)

it('forwards Claude token counting and strips only the OAuth beta for an endpoint key', async () => {
  const client = await gatewayHttp(harness, CLAUDE, 'endpoint', 2)
  try {
    const response = await client.request(
      gatewayPath('claude', '/v1/messages/count_tokens'),
      {
        headers: {
          Authorization: `Bearer ${client.token}`,
          'x-api-key': '',
          'anthropic-beta':
            'claude-code-20250219, oauth-2025-04-20,keep-this-beta',
        },
      },
    )
    expect(response.status).toBe(200)
    await response.text()
    expect(client.ownEndpoint.requests[0].url).toBe(
      'https://proxy.example.test:8443/private/v1/messages/count_tokens?key=value',
    )
    expect(client.ownEndpoint.requests[0].headers.get('anthropic-beta')).toBe(
      'claude-code-20250219,keep-this-beta',
    )
    const discovery = await client.request(
      gatewayPath('claude', '/v1/models'),
      { method: 'GET', body: undefined },
    )
    expect(discovery.status).toBe(404)
    expect(client.ownEndpoint.requests).toHaveLength(1)
  } finally {
    await client.dispose()
  }
})

it.each([
  'https://127.0.0.1/private',
  'https://port.custom-previews.example.test/private',
])('checks the endpoint again at fetch and refuses %s', async (address) => {
  const client = await gatewayHttp(harness, CODEX, 'endpoint', 2)
  try {
    client.fixture.env.PREVIEW_DOMAIN = 'custom-previews.example.test'
    const check = client.endpoint.checkTurnToken
    client.endpoint.checkTurnToken = async (token) => {
      const result = await check(token)
      return result.ok && result.login.kind === 'endpoint'
        ? {
            ...result,
            login: { ...result.login, endpoint: address },
          }
        : result
    }
    const response = await client.request()
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: { code: 'agent_login_unavailable' },
    })
    expect(client.ownEndpoint.requests).toEqual([])
    expect(client.anthropic.requests).toEqual([])
    expect(client.openai.requests).toEqual([])
  } finally {
    await client.dispose()
  }
})

it('does not follow an endpoint redirect or expose its address in response headers', async () => {
  const client = await gatewayHttp(harness, CODEX, 'endpoint', 2)
  try {
    client.ownEndpoint.response = () =>
      new Response(null, {
        status: 307,
        headers: {
          location: 'https://127.0.0.1/private',
          'x-request-id': gatewayOwnEndpoint,
        },
      })
    const response = await client.request()
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-request-id')).toBe('[redacted]')
    expect(client.ownEndpoint.requests).toHaveLength(1)
  } finally {
    await client.dispose()
  }
})

it.each([CLAUDE, CODEX])(
  'names an unreachable $agent endpoint without its host or key',
  async (choice) => {
    const client = await gatewayHttp(harness, choice, 'endpoint', 2)
    try {
      client.ownEndpoint.response = () => {
        throw new Error(
          `Cannot connect to ${gatewayOwnEndpoint} using ${client.secret}`,
        )
      }
      const response = await client.request()
      expect(response.status).toBe(502)
      expect(await response.json()).toMatchObject({
        error: {
          code: 'model_endpoint_unreachable',
          message: 'The endpoint of this login is unreachable. Try again.',
        },
      })
      expect(client.ownEndpoint.requests).toHaveLength(1)
    } finally {
      await client.dispose()
    }
  },
)
