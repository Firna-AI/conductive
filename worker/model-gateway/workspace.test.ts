import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import {
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from '../chat/harness.test-support'
import { terminalEvent } from '../chat/turn-lifecycle.test-support'
import { hash } from '../security/crypto'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  issueGatewayToken,
  runningGatewayTurn,
  turnEnds,
} from './fixture.test-support'
import { turnTokenRoute } from './token'

describe('workspace turn tokens', () => {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
  })
  afterAll(async () => {
    await harness.dispose()
  })

  it('keeps a starter token across reconnect and restart without storing the credential', async () => {
    const { fixture, runner, turn, token, issue, check } =
      await runningGatewayTurn(harness, CODEX)
    expect(turnTokenRoute(token)).toEqual({
      workspaceId: WORKSPACE_ID,
      turnId: turn.turnId,
    })
    expect(await check()).toEqual({
      ok: true,
      login: {
        agent: 'codex',
        kind: 'api-key',
        secret: `secret-${fixture.member.id}-codex`,
      },
    })
    await fixture.connect(runner)
    expect(await issue()).toBe(token)
    await fixture.chat.closeConnections()
    await fixture.restart()
    await fixture.connect(runner)
    expect(await issue()).toBe(token)
    expect((await check()).ok).toBe(true)
    const stored = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turn.turnId),
    )
    expect(stored?.gateway).toEqual({
      nonce: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      loginVersion: TEST_TIME,
    })
    expect(
      JSON.stringify([...(await fixture.snapshot()).records]),
    ).not.toContain(token)
    expect(JSON.stringify(runner.received)).toContain(token)
    expect(JSON.stringify(runner.received)).not.toContain(
      `secret-${fixture.member.id}-codex`,
    )
    runner.emit(terminalEvent(turn, 'finished'))
    await fixture.drain()
    expect(await check()).toEqual({ ok: false, reason: 'turn_not_active' })
    await fixture.send(
      turn.sessionId,
      'second-message',
      fixture.ownerCookie,
      CODEX,
    )
    const next = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(turn.sessionId),
    )
    expect(next?.activeTurnId).not.toBe(turn.turnId)
    const nextToken = await issueGatewayToken(fixture, next?.activeTurnId ?? '')
    expect(nextToken).not.toBeNull()
    expect(nextToken).not.toBe(token)
    await fixture.chat.closeConnections()
  })

  it('does not issue a token before the turn runs', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    await fixture.send(session.id)
    const queued = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    )
    const turnId = queued?.activeTurnId ?? ''
    expect(turnId).not.toBe('')
    expect(await issueGatewayToken(fixture, turnId ?? '')).toBeNull()
    expect(
      (
        await fixture.chat.store.read(WORKSPACE_ID, (view) =>
          view.turn(turnId ?? ''),
        )
      )?.gateway,
    ).toBeUndefined()
    await fixture.chat.closeConnections()
  })

  it.each(['stopping', 'closed', 'inactive'] as const)(
    'refuses a token when its turn is %s',
    async (state) => {
      const { fixture, session, turn, check, issue } =
        await runningGatewayTurn(harness)
      if (state === 'stopping') {
        const response = await fixture.fetch(
          sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
          { turnId: turn.turnId },
        )
        expect(response.status).toBe(200)
      } else {
        await fixture.chat.changeWorkspace(
          WORKSPACE_ID,
          async (transaction) => {
            const current = await transaction.session(session.id)
            if (!current) throw new Error('The session is missing.')
            if (state === 'closed') current.closedAt = TEST_TIME
            else current.activeTurnId = null
            await transaction.saveSession(current)
          },
        )
      }
      expect(await check()).toEqual({ ok: false, reason: 'turn_not_active' })
      expect(await issue()).toBeNull()
      expect(turnEnds(await fixture.history(session.id))).toEqual([])
      await fixture.chat.closeConnections()
    },
  )

  it('refuses another workspace and changed, forged, or unrelated credentials without ending the turn', async () => {
    const { fixture, session, token, check, turn } =
      await runningGatewayTurn(harness)
    expect(
      await fixture.chat.turnTokens.check('another-workspace', token),
    ).toEqual({ ok: false, reason: 'turn_token_invalid' })
    const parts = token.split('.')
    const forged = `${parts[0]}.${parts[1]}.${await hash('forged-secret')}`
    const changed = `${parts[0]}.${parts[1]}.${parts[2]?.startsWith('A') ? 'B' : 'A'}${parts[2]?.slice(1)}`
    const routed = `${parts[0]}.${btoa(JSON.stringify([WORKSPACE_ID, 'another-turn'])).replaceAll('=', '')}.${parts[2]}`
    for (const value of [
      forged,
      changed,
      routed,
      'workspace-token',
      token + '.extra',
    ]) {
      expect(await check(value), value).toEqual({
        ok: false,
        reason: 'turn_token_invalid',
      })
    }
    expect(
      (
        await fixture.chat.store.read(WORKSPACE_ID, (view) =>
          view.turn(turn.turnId),
        )
      )?.state,
    ).toBe('running')
    expect(turnEnds(await fixture.history(session.id))).toEqual([])
    await fixture.chat.closeConnections()
  })
})
