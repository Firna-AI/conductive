import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import {
  preferChatOrgLogin,
  replaceChatOrgLogin,
  saveChatOrgLogin,
} from '../chat/org-login.test-support'
import { retryRequest } from '../chat/retry.test-support'
import {
  messageCommands,
  terminalEvent,
} from '../chat/turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('keeps an org turn through switch changes and starter departure, fails replacement, and retries with the new key', async () => {
  const fixture = await createChatFixture(harness)
  await saveChatOrgLogin(harness, fixture)
  await preferChatOrgLogin(harness, fixture, true)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await fixture.send(session.id, 'org-turn', fixture.memberCookie)
  const command = messageCommands(runner, 'org-turn')[0]
  if (command?.type !== 'turn') throw new Error('No org turn')
  const token = command.credential.token
  expect(
    await fixture.chat.turnTokens.check(WORKSPACE_ID, token),
  ).toMatchObject({ ok: true, login: { secret: 'org-key' } })
  await preferChatOrgLogin(harness, fixture, false)
  expect(
    await fixture.chat.turnTokens.check(WORKSPACE_ID, token),
  ).toMatchObject({ ok: true, login: { secret: 'org-key' } })
  await preferChatOrgLogin(harness, fixture, true)
  await harness.env.DB.prepare(
    'UPDATE workspaces SET owner_user_id = ? WHERE id = ?',
  )
    .bind(fixture.member.id, WORKSPACE_ID)
    .run()
  await harness.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(fixture.org.id, fixture.owner.id)
    .run()
  expect(
    await fixture.chat.turnTokens.check(WORKSPACE_ID, token),
  ).toMatchObject({ ok: true, login: { secret: 'org-key' } })
  await replaceChatOrgLogin(harness, fixture, 'replacement-key')
  expect(await fixture.chat.turnTokens.check(WORKSPACE_ID, token)).toEqual({
    ok: false,
    reason: 'agent_login_changed',
  })
  runner.emit(terminalEvent(command, 'stopped'))
  await fixture.drain()
  const history = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  expect(history.events.map(({ event }) => event)).toContainEqual(
    expect.objectContaining({
      type: 'turn.failed',
      error: {
        code: 'agent_login_required',
        message:
          "Example org's Claude login changed. Try again to use the new login.",
      },
    }),
  )
  const failed = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.session(session.id),
  )
  expect(failed).toMatchObject({
    login: { type: 'org', orgId: fixture.org.id },
    retryMessageId: 'org-turn',
  })
  const retried = await retryRequest(
    fixture,
    session.id,
    'org-turn',
    fixture.memberCookie,
  )
  expect(retried.status).toBe(202)
  expect(await retried.json()).toMatchObject({
    session: { id: session.id, login: { type: 'org', orgId: fixture.org.id } },
  })
  const current = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.session(session.id),
  )
  const newToken = await fixture.chat.turnTokens.forRunningTurn(
    WORKSPACE_ID,
    current?.activeTurnId ?? '',
  )
  expect(
    await fixture.chat.turnTokens.check(WORKSPACE_ID, newToken ?? ''),
  ).toMatchObject({ ok: true, login: { secret: 'replacement-key' } })
  await harness.env.DB.prepare('UPDATE users SET suspended_at = 1 WHERE id = ?')
    .bind(fixture.member.id)
    .run()
  expect(
    await fixture.chat.turnTokens.check(WORKSPACE_ID, newToken ?? ''),
  ).toEqual({ ok: false, reason: 'agent_login_unavailable' })
})
