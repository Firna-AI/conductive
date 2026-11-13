import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { expectGatewayLogin } from './runner-credential.test-support'
import { hash } from '../security/crypto'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  CLAUDE,
  createChatFixture,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
describe('connected runner access', () => {
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
  it('closes a connected runner before sending logins after its token is revoked or replaced', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await harness.env.DB.prepare(
      'UPDATE workspace_tokens SET revoked_at = ? WHERE workspace_id = ?',
    )
      .bind(TEST_TIME, WORKSPACE_ID)
      .run()
    const accepted = await fixture.send(
      session.id,
      'after-revocation',
      fixture.memberCookie,
    )
    expect(accepted.message.state).toBe('queued')
    expect(runner.commands).toEqual([])
    expect(fixture.transport.closedConnections).toBe(1)
    const pending = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.pending(),
    )
    expect(pending).toMatchObject([
      { type: 'turn', messageId: 'after-revocation' },
    ])
    expect(
      (await fixture.history(session.id)).events.map(({ event }) => event.type),
    ).not.toContain('turn.failed')
    const replacement = 'replacement-workspace-token'
    await harness.env.DB.prepare(
      'UPDATE workspace_tokens SET token_hash = ?, revoked_at = NULL WHERE workspace_id = ?',
    )
      .bind(await hash(replacement), WORKSPACE_ID)
      .run()
    await expect(
      fixture.connect(runner, { workspaceToken: WORKSPACE_TOKEN }),
    ).rejects.toMatchObject({ status: 401, code: 'workspace_token_required' })
    await fixture.connect(runner, { workspaceToken: replacement })
    const first = runner.commands[0]
    expect(first?.type).toBe('turn')
    if (first?.type !== 'turn')
      throw new Error('Expected the preserved queued turn.')
    expect(first.commandId).toBe(pending[0]?.commandId)
    await expectGatewayLogin(
      fixture,
      first,
      `secret-${fixture.owner.id}-claude`,
    )
    runner.emit({
      type: 'turn.started',
      sessionId: session.id,
      turnId: first.turnId,
      senderId: fixture.member.id,
      choice: CLAUDE,
      startedAt: TEST_TIME,
      messageIds: ['after-revocation'],
    })
    await fixture.drain()
    await harness.env.DB.prepare(
      'UPDATE workspace_tokens SET token_hash = ? WHERE workspace_id = ?',
    )
      .bind(await hash('next-workspace-token'), WORKSPACE_ID)
      .run()
    const closes = fixture.transport.closedConnections
    const during = await fixture.send(
      session.id,
      'after-replacement',
      fixture.memberCookie,
    )
    expect(during.message.state).toBe('queued')
    expect(runner.commands).toHaveLength(1)
    expect(fixture.transport.closedConnections).toBe(closes + 1)
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toMatchObject([{ type: 'message', messageId: 'after-replacement' }])
    expect(
      JSON.stringify([...(await fixture.snapshot()).records.values()]),
    ).not.toContain(replacement)
    expect(
      JSON.stringify([...(await fixture.snapshot()).records.values()]),
    ).not.toContain('secret-')
    expect(
      (await fixture.history(session.id)).events.map(({ event }) => event.type),
    ).not.toContain('turn.failed')
  })
})
