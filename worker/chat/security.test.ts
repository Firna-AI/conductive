import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import type { SendMessageResponse } from '../../src/shared/messages'
import {
  retryMessagePath,
  sessionPaths,
  sessionsPath,
} from '../../src/shared/sessions'
import { workspacePath } from '../../src/shared/workspaces'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  CLAUDE,
  createChatFixture,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
} from './harness.test-support'

describe('workspace chat security', () => {
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

  it('uses the app gate, org membership, and stored workspace identity', async () => {
    const fixture = await createChatFixture(harness)
    await harness.env.DB.prepare('UPDATE workspaces SET state = ? WHERE id = ?')
      .bind('input', WORKSPACE_ID)
      .run()
    const path = sessionsPath(fixture.org.id, WORKSPACE_ID)
    const noSession = fixture.request(path)
    noSession.headers.delete('Cookie')
    expect((await fixture.chat.fetch(noSession)).status).toBe(401)
    const wrongOrigin = fixture.request(path, { choice: CLAUDE })
    wrongOrigin.headers.set('Origin', 'https://untrusted.example')
    expect((await fixture.chat.fetch(wrongOrigin)).status).toBe(403)
    const wrongSocket = fixture.request(path)
    wrongSocket.headers.set('Upgrade', 'websocket')
    wrongSocket.headers.set('Origin', 'https://untrusted.example')
    expect((await fixture.chat.fetch(wrongSocket)).status).toBe(403)
    const otherOrg = await harness.createOrg(fixture.memberCookie, 'Other org')
    expect(
      (
        await fixture.fetch(
          sessionsPath(otherOrg.id, WORKSPACE_ID),
          undefined,
          fixture.memberCookie,
        )
      ).status,
    ).toBe(404)
    const session = await fixture.createSession()
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      {
        id: 'forged-sender',
        choice: CLAUDE,
        text: 'Hello',
        attachmentIds: [],
        sender: { id: fixture.owner.id },
        workspaceId: 'another-workspace',
      },
      fixture.memberCookie,
    )
    const accepted: SendMessageResponse = await response.json()
    expect(response.status).toBe(202)
    expect(accepted.message.sender.id).toBe(fixture.member.id)
    await harness.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(fixture.org.id, fixture.member.id)
      .run()
    expect(
      (await fixture.fetch(path, undefined, fixture.memberCookie)).status,
    ).toBe(404)
    await harness.env.DB.prepare(
      'UPDATE workspaces SET archived_at = ? WHERE id = ?',
    )
      .bind(1_800_000_000_000, WORKSPACE_ID)
      .run()
    expect((await fixture.fetch(path, { choice: CLAUDE })).status).toBe(409)
    expect((await fixture.fetch(path)).status).toBe(200)
    await expect(
      fixture.chat.appendWorkspaceEvent('other-workspace', {
        type: 'workspace.title',
        name: 'Wrong object',
      }),
    ).rejects.toMatchObject({ status: 404, code: 'workspace_not_found' })
    expect(
      (
        await fixture.fetch(
          `${workspacePath(fixture.org.id, 'missing')}/sessions`,
        )
      ).status,
    ).toBe(404)
    expect((await fixture.fetch(API_PATHS.orgs)).status).toBe(404)
  })

  it('authenticates the runner token and validates its hello and neutral event type', async () => {
    const fixture = await createChatFixture(harness)
    await expect(
      fixture.connect(undefined, { url: `${MACHINE_ORIGIN}/runner` }),
    ).rejects.toMatchObject({ status: 403, code: 'machine_forbidden' })
    await expect(
      fixture.connect(undefined, { workspaceToken: 'wrong-token' }),
    ).rejects.toMatchObject({ status: 401, code: 'workspace_token_required' })
    await expect(
      fixture.connect(new FakeRunner({ workspaceId: 'another-workspace' })),
    ).rejects.toMatchObject({ status: 400, code: 'runner_hello_mismatch' })
    const runner = await fixture.connect()
    const session = await fixture.createSession()
    await fixture.send(session.id)
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const before = runner.received.length
    const command = runner.commands[0]
    if (command?.type !== 'turn') throw new Error('Expected a turn.')
    runner.sendEnvelope({
      type: 'event',
      streamId: 'fake-stream-1',
      eventNumber: 2,
      occurredAt: 1_800_000_000_000,
      event: Object.assign(
        {
          type: 'turn.thinking' as const,
          sessionId: session.id,
          turnId: command.turnId,
        },
        { type: 'sdk.system' },
      ),
    })
    await fixture.drain()
    expect(runner.received).toHaveLength(before + 1)
    expect(runner.received.at(-1)).toEqual({
      type: 'confirm',
      streamId: 'fake-stream-1',
      throughEventNumber: 2,
    })
    expect((await fixture.history(session.id)).events.at(-1)?.event).toEqual({
      type: 'runner.event-refused',
      streamId: 'fake-stream-1',
      runnerEventNumber: 2,
      runnerEventType: 'unknown',
      reason: 'invalid',
      sessionId: session.id,
      turnId: command.turnId,
    })
    expect(
      (await fixture.history(session.id)).events.map(({ event }) => event.type),
    ).not.toContain('turn.thinking')
  })

  it('retries a failed turn with the requesting member login once', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const command = runner.commands[0]
    if (command?.type !== 'turn') throw new Error('Expected a turn.')
    runner.emit({
      type: 'turn.failed',
      sessionId: session.id,
      turnId: command.turnId,
      error: {
        code: 'agent_unavailable',
        message: 'The agent is busy. Try again.',
      },
      retryMessageId: 'message-1',
      durationMs: 10,
    })
    await fixture.drain()
    const retryPath = retryMessagePath(
      fixture.org.id,
      WORKSPACE_ID,
      session.id,
      'message-1',
    )
    const response = await fixture.fetch(retryPath, {}, fixture.memberCookie)
    const retry: SendMessageResponse = await response.json()
    expect(response.status).toBe(202)
    expect(retry.message.sender.id).toBe(fixture.member.id)
    expect(retry.message.id).not.toBe('message-1')
    expect(
      await (await fixture.fetch(retryPath, {}, fixture.memberCookie)).json(),
    ).toMatchObject({ message: { id: retry.message.id } })
    expect(runner.commands).toHaveLength(2)
    const retried = runner.commands[1]
    if (retried?.type !== 'turn') throw new Error('Expected a retry turn.')
    expect(retried.login.secret).toBe(`secret-${fixture.member.id}-claude`)
  })
})
