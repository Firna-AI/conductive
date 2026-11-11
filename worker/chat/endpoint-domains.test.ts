import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { encrypt } from '../security/crypto'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { captureLoginQueries } from './login-queries.test-support'
import { agentLoginContext } from './queries'
import { sessionRecord } from './retry.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const previewDomain = 'custom-previews.example.test'

it('refuses a configured preview endpoint before runner dispatch with the account-page cause', async () => {
  const fixture = await createChatFixture(harness)
  try {
    const session = await fixture.createSession()
    const first = await fixture.send(session.id, 'preview-message')
    const saved = await harness.request(
      agentLoginPath('claude'),
      fixture.ownerCookie,
      {
        method: 'PUT',
        body: JSON.stringify({
          agent: 'claude',
          kind: 'endpoint',
          endpoint: `https://port.${previewDomain}/v1`,
          secret: 'fake-endpoint-key',
        }),
      },
    )
    expect(saved.status).toBe(200)
    await fixture.setEnvironment({ PREVIEW_DOMAIN: previewDomain })
    const runner = new FakeRunner({
      workspaceId: WORKSPACE_ID,
      protocolVersion: 2,
    })
    runner.emit({ type: 'runner.ready' })
    await fixture.connect(runner)
    expect(runner.commands).toEqual([])
    expect(
      (await fixture.history(session.id)).events.map(({ event }) => event),
    ).toContainEqual({
      type: 'turn.failed',
      sessionId: session.id,
      turnId: first.session.activeTurnId,
      error: {
        code: 'agent_login_required',
        message:
          "Octocat's Claude login needs a public https:// endpoint. Update the login on the account page.",
      },
      retryMessageId: 'preview-message',
      durationMs: 0,
    })
    expect(await sessionRecord(fixture, session.id)).toMatchObject({
      loginAvailable: false,
      loginShared: false,
    })
  } finally {
    await fixture.chat.closeConnections()
  }
})

it('checks endpoint origins in one metadata query without reading or decrypting credentials', async () => {
  const fixture = await createChatFixture(harness)
  const controls = fixture.actor.api.controls
  try {
    const session = await fixture.createSession()
    await fixture.setEnvironment({ PREVIEW_DOMAIN: previewDomain })
    const ciphertext = await encrypt(
      JSON.stringify({
        endpoint: 'https://public.example.test/private',
        secret: 'fake-endpoint-key',
      }),
      agentLoginContext(fixture.owner.id, CLAUDE.agent),
      fixture.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await fixture.env.DB.prepare(
      'UPDATE agent_logins SET kind = ?, ciphertext = ?, endpoint_origin = ? WHERE user_id = ? AND agent = ?',
    )
      .bind(
        'endpoint',
        ciphertext,
        'https://public.example.test',
        fixture.owner.id,
        CLAUDE.agent,
      )
      .run()
    const queries = await captureLoginQueries(fixture)
    for (const [origin, available] of [
      ['https://public.example.test', true],
      [`https://port.${previewDomain}`, false],
      ['https://127.0.0.1', false],
    ] as const) {
      await fixture.env.DB.prepare(
        'UPDATE agent_logins SET endpoint_origin = ? WHERE user_id = ? AND agent = ?',
      )
        .bind(origin, fixture.owner.id, CLAUDE.agent)
        .run()
      queries.length = 0
      await controls.captureDecrypt(true)
      const tab = await fixture.tab()
      expect(await sessionRecord(fixture, session.id), origin).toMatchObject({
        loginAvailable: available,
        loginShared: available,
      })
      expect(queries, origin).toHaveLength(1)
      expect(queries[0]?.query).not.toMatch(/ciphertext|SELECT\s+\*/i)
      expect(await controls.decryptCalls(), origin).toBe(0)
      await controls.captureDecrypt(false)
      await tab.close()
    }
  } finally {
    await controls.captureDecrypt(false)
    await fixture.chat.closeConnections()
  }
})
