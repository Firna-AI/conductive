import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { sessionPaths } from '../../src/shared/sessions'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'
import { sessionRecord } from './retry.test-support'
import { agentLoginContext } from './queries'
import { encrypt } from '../security/crypto'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const cases = [CLAUDE, CODEX].flatMap((choice) =>
  [false, true].map((noReuse) => ({
    choice,
    agent: choice.agent,
    noReuse,
    refusedEndpoint: 'https://192.168.1.1/private',
  })),
)

cases.push(
  {
    choice: CLAUDE,
    agent: 'claude',
    noReuse: false,
    refusedEndpoint: 'https://8.8.8.8/private',
  },
  {
    choice: CODEX,
    agent: 'codex',
    noReuse: false,
    refusedEndpoint: 'https://[2606:4700:4700::1111]/private',
  },
)

it.each(cases)(
  'blocks $agent endpoint $refusedEndpoint when refused, with noReuse=$noReuse',
  async ({ choice, noReuse, refusedEndpoint }) => {
    const fixture = await createChatFixture(harness)
    try {
      const session = await fixture.createSession(choice)
      const first = await fixture.send(
        session.id,
        'first',
        fixture.memberCookie,
        choice,
      )
      await fixture.send(session.id, 'next', fixture.memberCookie, choice)
      const endpoint = 'https://proxy.example.test/private/v1?key=value'
      const path = agentLoginPath(choice.agent)
      const saved = await harness.request(path, fixture.ownerCookie, {
        method: 'PUT',
        body: JSON.stringify({
          agent: choice.agent,
          kind: 'endpoint',
          endpoint,
          secret: 'endpoint-key',
        }),
      })
      expect(saved.status).toBe(200)
      await fixture.env.DB.prepare(
        'UPDATE agent_logins SET ciphertext = ?, endpoint_origin = ? WHERE user_id = ? AND agent = ?',
      )
        .bind(
          await encrypt(
            JSON.stringify({
              endpoint: refusedEndpoint,
              secret: 'endpoint-key',
            }),
            agentLoginContext(fixture.owner.id, choice.agent),
            fixture.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
          new URL(refusedEndpoint).origin,
          fixture.owner.id,
          choice.agent,
        )
        .run()
      const sharing = await harness.request(path, fixture.ownerCookie, {
        method: 'PATCH',
        body: JSON.stringify({ noReuse }),
      })
      expect(sharing.status).toBe(200)
      const runner = new FakeRunner({
        workspaceId: WORKSPACE_ID,
      })
      runner.emit({ type: 'runner.ready' })
      await fixture.connect(runner)
      expect(runner.commands).toEqual([])
      const history = await fixture.history(session.id)
      expect(history.events.map(({ event }) => event)).toContainEqual({
        type: 'turn.failed',
        sessionId: session.id,
        turnId: first.session.activeTurnId,
        error: {
          code: 'agent_login_required',
          message: `Octocat's ${choice.agent === 'claude' ? 'Claude' : 'Codex'} login needs a public https:// endpoint with a host name. Update the login on the account page.`,
        },
        retryMessageId: 'first',
        durationMs: 0,
      })
      expect(await sessionRecord(fixture, session.id)).toMatchObject({
        loginAvailable: false,
        loginShared: false,
        activeTurnId: null,
      })
      expect(await fixture.createSession(choice)).toMatchObject({
        loginAvailable: false,
        loginShared: false,
      })
      const refused = await fixture.fetch(
        sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
        { id: 'refused', text: 'Try this login', choice, attachmentIds: [] },
      )
      expect(refused.status).toBe(409)
      expect(await refused.json()).toMatchObject({
        error: { code: 'agent_login_required' },
      })
      expect(runner.commands).toEqual([])
      expect(JSON.stringify(runner.received)).not.toMatch(
        /endpoint-key|proxy\.example\.test|password|private\/v1|key=value/,
      )
      expect(
        JSON.stringify([...(await fixture.snapshot()).records]),
      ).not.toMatch(/endpoint-key|password|private\/v1|key=value/)
    } finally {
      await fixture.chat.closeConnections()
    }
  },
)

it('moves another member to a linked session when the starter endpoint is refused', async () => {
  const fixture = await createChatFixture(harness)
  try {
    const session = await fixture.createSession(CLAUDE)
    await fixture.env.DB.prepare(
      "UPDATE agent_logins SET kind = ?, ciphertext = ?, endpoint_origin = 'https://127.0.0.1' WHERE user_id = ? AND agent = ?",
    )
      .bind(
        'endpoint',
        await encrypt(
          JSON.stringify({
            endpoint: 'https://127.0.0.1/private',
            secret: 'endpoint-key',
          }),
          agentLoginContext(fixture.owner.id, 'claude'),
          fixture.env.BOAT_KEY_ENCRYPTION_KEY,
        ),
        fixture.owner.id,
        'claude',
      )
      .run()
    const runner = new FakeRunner({
      workspaceId: WORKSPACE_ID,
    })
    runner.emit({ type: 'runner.ready' })
    await fixture.connect(runner)
    const accepted = await fixture.send(
      session.id,
      'linked',
      fixture.memberCookie,
      CLAUDE,
    )
    expect(accepted.session).toMatchObject({
      sourceSessionId: session.id,
      startedBy: { id: fixture.member.id },
      loginAvailable: true,
    })
    expect(await sessionRecord(fixture, session.id)).toMatchObject({
      loginAvailable: false,
      loginShared: false,
    })
    expect(runner.commands).toContainEqual(
      expect.objectContaining({
        type: 'turn',
        sessionId: accepted.session.id,
        credential: {
          agent: 'claude',
          kind: 'api-key',
          token: expect.any(String),
        },
      }),
    )
    expect(JSON.stringify(runner.received)).not.toMatch(
      /endpoint-key|127\.0\.0\.1\/private/,
    )
  } finally {
    await fixture.chat.closeConnections()
  }
})
