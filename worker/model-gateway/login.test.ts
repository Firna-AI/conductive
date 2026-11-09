import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import { WORKSPACE_ID } from '../chat/harness.test-support'
import { retryRequest, sessionRecord } from '../chat/retry.test-support'
import { terminalEvent } from '../chat/turn-lifecycle.test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  issueGatewayToken,
  replaceGatewayLogin,
  runningGatewayTurn,
  turnEnds,
} from './fixture.test-support'

describe('gateway login changes', () => {
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

  it('stops a changed login once, publishes the cause in order, and retries with the new login', async () => {
    const { fixture, runner, session, turn, token, check } =
      await runningGatewayTurn(harness)
    const first = await fixture.tab()
    const second = await fixture.tab()
    const before = await fixture.history(session.id)
    await replaceGatewayLogin(fixture)
    expect(await Promise.all([check(), check()])).toEqual([
      { ok: false, reason: 'agent_login_changed' },
      { ok: false, reason: 'turn_not_active' },
    ])
    expect(
      runner.commands.filter((command) => command.type === 'interrupt'),
    ).toMatchObject([{ sessionId: session.id, turnId: turn.turnId }])
    const ended = await fixture.history(session.id)
    const ends = turnEnds(ended)
    expect(ends.map(({ event }) => event)).toEqual([
      {
        type: 'turn.failed',
        sessionId: session.id,
        turnId: turn.turnId,
        error: {
          code: 'agent_login_required',
          message:
            "Teammate's Claude login changed. Try again to use the new login.",
        },
        retryMessageId: turn.message.id,
        durationMs: 0,
      },
    ])
    const live = first.messages.flatMap((message) =>
      message.type === 'event' ? [message.envelope] : [],
    )
    expect(second.messages).toEqual(first.messages)
    expect(live).toEqual(
      ended.events.filter(
        ({ eventNumber }) => eventNumber > before.throughEventNumber,
      ),
    )
    expect(live.map(({ eventNumber }) => eventNumber)).toEqual(
      [...live.map(({ eventNumber }) => eventNumber)].sort((a, b) => a - b),
    )
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      turn.message.id,
    )
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toEqual([])
    runner.emit(terminalEvent(turn, 'stopped'))
    const late = runner.emit({
      type: 'assistant.delta',
      sessionId: session.id,
      turnId: turn.turnId,
      messageId: 'late-answer',
      text: 'Keep this late answer.',
    })
    await fixture.drain()
    runner.sendEnvelope(late)
    await fixture.drain()
    const replayed = await fixture.history(session.id)
    expect(turnEnds(replayed)).toEqual(ends)
    expect(
      replayed.events.filter(({ late }) => late).map(({ event }) => event.type),
    ).toEqual(['turn.completed', 'assistant.delta'])
    const retry = await retryRequest(fixture, session.id, turn.message.id)
    expect(retry.status).toBe(202)
    const current = await sessionRecord(fixture, session.id)
    expect(current.activeTurnId).not.toBe(turn.turnId)
    const replacement = await issueGatewayToken(
      fixture,
      current.activeTurnId ?? '',
    )
    expect(replacement).not.toBe(token)
    expect(
      await fixture.chat.turnTokens.check(WORKSPACE_ID, replacement ?? ''),
    ).toEqual({
      ok: true,
      login: { agent: 'claude', kind: 'api-key', secret: 'new-login' },
    })
    expect(await check()).toEqual({ ok: false, reason: 'turn_not_active' })
    first.close()
    second.close()
    fixture.chat.closeConnections()
  })

  it.each([
    'removed login',
    'removed membership',
    'suspended starter',
    'stopped workspace',
    'archived workspace',
    'suspended org',
  ] as const)(
    'fails the turn with its unavailable-login cause after %s',
    async (change) => {
      const { fixture, runner, session, turn, check } =
        await runningGatewayTurn(harness)
      const db = fixture.env.DB
      const statements = {
        'removed login': db
          .prepare(
            "DELETE FROM agent_logins WHERE user_id = ? AND agent = 'claude'",
          )
          .bind(fixture.member.id),
        'removed membership': db
          .prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?')
          .bind(fixture.org.id, fixture.member.id),
        'suspended starter': db
          .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
          .bind(TEST_TIME, fixture.member.id),
        'stopped workspace': db
          .prepare("UPDATE workspaces SET state = 'stopped' WHERE id = ?")
          .bind(WORKSPACE_ID),
        'archived workspace': db
          .prepare('UPDATE workspaces SET archived_at = ? WHERE id = ?')
          .bind(TEST_TIME, WORKSPACE_ID),
        'suspended org': db
          .prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
          .bind(TEST_TIME, fixture.org.id),
      }
      await statements[change].run()
      expect(await check()).toEqual({
        ok: false,
        reason: 'agent_login_unavailable',
      })
      expect(await check()).toEqual({ ok: false, reason: 'turn_not_active' })
      const history = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.history(0),
      )
      expect(turnEnds(history).map(({ event }) => event)).toEqual([
        {
          type: 'turn.failed',
          sessionId: session.id,
          turnId: turn.turnId,
          error: {
            code: 'agent_login_required',
            message:
              "Teammate's Claude login is not available. Try again or send a new message.",
          },
          retryMessageId: turn.message.id,
          durationMs: 0,
        },
      ])
      expect(
        (
          await fixture.chat.store.read(WORKSPACE_ID, (view) =>
            view.turn(turn.turnId),
          )
        )?.state,
      ).toBe('failed')
      runner.disconnect()
      fixture.chat.closeConnections()
    },
  )

  it('retains the failure cause after a crash commits Stop, then accepts the runner end once', async () => {
    const { fixture, runner, session, turn, check } =
      await runningGatewayTurn(harness)
    await replaceGatewayLogin(fixture)
    fixture.storage.crashAfterCommit = true
    await expect(check()).rejects.toThrow('Injected post-commit crash')
    fixture.chat.closeConnections()
    fixture.restart()
    await fixture.connect(runner)
    expect(
      runner.commands.filter((command) => command.type === 'interrupt'),
    ).toHaveLength(1)
    const end = runner.emit(terminalEvent(turn, 'stopped'))
    await fixture.drain()
    runner.sendEnvelope(end)
    await fixture.drain()
    const ends: WorkspaceEventEnvelope[] = turnEnds(
      await fixture.history(session.id),
    )
    expect(ends.map(({ event }) => event)).toMatchObject([
      {
        type: 'turn.failed',
        error: {
          code: 'agent_login_required',
          message:
            "Teammate's Claude login changed. Try again to use the new login.",
        },
      },
    ])
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      turn.message.id,
    )
    fixture.chat.closeConnections()
  })
})
