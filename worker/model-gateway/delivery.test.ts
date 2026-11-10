import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX, WORKSPACE_ID } from '../chat/harness.test-support'
import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayHttp } from './http.test-support'
import { turnTokenRoute } from './token'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('delivers scoped protocol 2 credentials in native login modes and sends messages without credentials', async () => {
  for (const [agent, kind, prefix, header] of [
    ['claude', 'api-key', 'sk-ant-api-', 'x-api-key'],
    ['claude', 'token', 'sk-ant-oat01-', 'authorization'],
    ['codex', 'api-key', 'sk-', 'authorization'],
  ] as const) {
    await harness.reset()
    const client = await gatewayHttp(
      harness,
      agent === 'codex' ? CODEX : undefined,
      kind,
      2,
    )
    try {
      expect(client.runner.received[0]).toMatchObject({
        type: 'welcome',
        protocolVersion: 2,
      })
      expect(client.turn).toEqual({
        type: 'turn',
        commandId: expect.any(String),
        sessionId: client.session.id,
        turnId: client.turn.turnId,
        message: expect.objectContaining({
          id: 'gateway-message',
          state: 'sent',
        }),
        attachments: [],
        credential: { agent, kind, token: client.token },
      })
      expect(client.token.startsWith(prefix)).toBe(true)
      expect(turnTokenRoute(client.token)).toEqual({
        workspaceId: WORKSPACE_ID,
        turnId: client.turn.turnId,
      })
      const accepted = await client.fixture.send(
        client.session.id,
        'follow-up',
        client.fixture.ownerCookie,
        client.turn.message.choice,
      )
      expect(client.runner.commands.at(-1)).toEqual({
        type: 'message',
        commandId: expect.any(String),
        sessionId: client.session.id,
        turnId: client.turn.turnId,
        message: { ...accepted.message, state: 'sent' },
        attachments: [],
      })
      const response = await client.request()
      expect(response.status).toBe(200)
      await response.text()
      const upstream = agent === 'codex' ? client.openai : client.anthropic
      expect(upstream.requests).toHaveLength(1)
      expect(upstream.requests[0].headers.get(header)).toBe(
        header === 'authorization' ? `Bearer ${client.secret}` : client.secret,
      )
      expect(JSON.stringify(client.runner.received)).not.toContain(
        client.secret,
      )
      expect(
        JSON.stringify([...(await client.fixture.snapshot()).records]),
      ).not.toContain(client.token)
      const changedMode = client.token.replace(
        prefix,
        prefix === 'sk-ant-api-' ? 'sk-ant-oat01-' : 'sk-ant-api-',
      )
      expect(await client.check(changedMode)).toEqual({
        ok: false,
        reason: 'turn_token_invalid',
      })
      const stop = await client.fixture.fetch(
        sessionPaths.interrupt(
          client.fixture.org.id,
          WORKSPACE_ID,
          client.session.id,
        ),
        { turnId: client.turn.turnId },
      )
      expect(stop.status).toBe(200)
      const revoked = await client.request()
      expect(revoked.status).toBe(409)
      expect(await revoked.json()).toMatchObject({
        error: { code: 'turn_not_active' },
      })
      expect(upstream.requests).toHaveLength(1)
    } finally {
      await client.dispose()
    }
  }
})
