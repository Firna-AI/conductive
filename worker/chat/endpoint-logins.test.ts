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

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

const cases = ([1, 2] as const).flatMap((protocolVersion) =>
  [CLAUDE, CODEX].flatMap((choice) =>
    [false, true].map((noReuse) => ({
      choice,
      agent: choice.agent,
      protocolVersion,
      noReuse,
    })),
  ),
)

it.each(cases)(
  'blocks $agent endpoint commands on protocol $protocolVersion with noReuse=$noReuse',
  async ({ choice, protocolVersion, noReuse }) => {
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
      const endpoint =
        'https://user:password@proxy.example.test/private/v1?key=value#part'
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
      const sharing = await harness.request(path, fixture.ownerCookie, {
        method: 'PATCH',
        body: JSON.stringify({ noReuse }),
      })
      expect(sharing.status).toBe(200)
      const runner = new FakeRunner({
        workspaceId: WORKSPACE_ID,
        protocolVersion,
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
          message: `Octocat's ${choice.agent === 'claude' ? 'Claude' : 'Codex'} login is not available. Try again or send a new message.`,
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
