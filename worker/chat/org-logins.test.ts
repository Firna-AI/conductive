import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createFirstMessageFixture } from './first-message.test-support'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'
import {
  saveChatOrgLogin,
  preferChatOrgLogin,
  removePersonalLogin,
  removeChatOrgLogin,
} from './org-login.test-support'
import { expectGatewayLogin } from './runner-credential.test-support'
import { retryRequest, sessionRecord } from './retry.test-support'
import { messageCommands } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('admits the workspace first message on the org login and serves another member after the starter leaves', async () => {
  const { fixture, first, acceptFirst } =
    await createFirstMessageFixture(harness)
  await saveChatOrgLogin(harness, fixture)
  await removePersonalLogin(harness, fixture.owner.id)
  await acceptFirst()
  const login = { type: 'org', orgId: fixture.org.id }
  expect(await sessionRecord(fixture, first.sessionId)).toMatchObject({
    login,
    loginAvailable: true,
    loginShared: true,
  })
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
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  // The first sender left, so that accepted message fails. A current member can continue the same session.
  const next = await fixture.send(
    first.sessionId,
    'member-message',
    fixture.memberCookie,
  )
  expect(next.session).toMatchObject({
    id: first.sessionId,
    login,
    startedBy: { id: fixture.owner.id },
  })
  const command = messageCommands(runner, 'member-message')[0]
  await expectGatewayLogin(fixture, command, 'org-key')
  expect(JSON.stringify(runner.received)).not.toContain('org-key')
  expect(JSON.stringify((await fixture.snapshot()).records)).not.toContain(
    'org-key',
  )
})

it('selects the default at acceptance, follows both switch values, and keeps each accepted login', async () => {
  const fixture = await createChatFixture(harness)
  await saveChatOrgLogin(harness, fixture)
  const empty = await fixture.createSession()
  expect(empty.login).toBeUndefined()
  await preferChatOrgLogin(harness, fixture, true)
  const org = await fixture.send(empty.id, 'org')
  expect(org.session.login).toEqual({ type: 'org', orgId: fixture.org.id })
  await preferChatOrgLogin(harness, fixture, false)
  expect((await fixture.send(empty.id, 'keep-org')).session.login).toEqual(
    org.session.login,
  )
  const personal = await fixture.createSession()
  const own = await fixture.send(personal.id, 'personal')
  expect(own.session.login).toEqual({
    type: 'personal',
    userId: fixture.owner.id,
  })
  await preferChatOrgLogin(harness, fixture, true)
  expect(
    (await fixture.send(personal.id, 'keep-personal')).session.login,
  ).toEqual(own.session.login)
  await removeChatOrgLogin(harness, fixture)
  const fallback = await fixture.send(
    (await fixture.createSession()).id,
    'fallback',
  )
  expect(fallback.session.login).toEqual(own.session.login)
})

it('uses the org default for an unusable personal login and links the starter away from an unusable pinned login', async () => {
  const fixture = await createChatFixture(harness)
  const personal = await fixture.createSession(CODEX)
  const own = await fixture.send(personal.id, 'own', fixture.ownerCookie, CODEX)
  await saveChatOrgLogin(harness, fixture, { agent: 'codex' })
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET failure_cause = 'Reconnect Codex' WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(fixture.owner.id)
    .run()
  const linked = await fixture.send(
    personal.id,
    'linked',
    fixture.ownerCookie,
    CODEX,
  )
  expect(linked.session).toMatchObject({
    sourceSessionId: personal.id,
    login: { type: 'org', orgId: fixture.org.id },
  })
  expect((await sessionRecord(fixture, personal.id)).login).toEqual(
    own.session.login,
  )
  const newSession = await fixture.send(
    (await fixture.createSession(CODEX)).id,
    'new',
    fixture.ownerCookie,
    CODEX,
  )
  expect(newSession.session.login).toEqual(linked.session.login)
})

it('keeps a waiting message in its org session after removal and sends its retry to the sender default', async () => {
  const fixture = await createChatFixture(harness)
  await saveChatOrgLogin(harness, fixture)
  await preferChatOrgLogin(harness, fixture, true)
  const session = await fixture.createSession()
  await fixture.send(session.id, 'waiting')
  await removeChatOrgLogin(harness, fixture)
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(messageCommands(runner, 'waiting')).toEqual([])
  expect(await sessionRecord(fixture, session.id)).toMatchObject({
    login: { type: 'org', orgId: fixture.org.id },
    loginAvailable: false,
    loginShared: true,
    retryMessageId: 'waiting',
  })
  const retried = await retryRequest(fixture, session.id, 'waiting')
  expect(retried.status).toBe(202)
  const next: import('../../src/shared/messages').SendMessageResponse =
    await retried.json()
  expect(next.session).toMatchObject({
    sourceSessionId: session.id,
    login: { type: 'personal', userId: fixture.owner.id },
  })
  await expectGatewayLogin(
    fixture,
    messageCommands(runner, next.message.id)[0],
    `secret-${fixture.owner.id}-claude`,
  )
})

it('names the org, agent, and Agents tab when a stored org endpoint is refused at dispatch', async () => {
  const fixture = await createChatFixture(harness)
  await saveChatOrgLogin(harness, fixture)
  await preferChatOrgLogin(harness, fixture, true)
  const session = await fixture.createSession()
  await fixture.send(session.id, 'waiting')
  await saveChatOrgLogin(harness, fixture, {
    endpoint: 'https://127.0.0.1/private',
  })
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(messageCommands(runner, 'waiting')).toEqual([])
  expect(
    (await fixture.history(session.id)).events.map(({ event }) => event),
  ).toContainEqual(
    expect.objectContaining({
      type: 'turn.failed',
      error: {
        code: 'agent_login_required',
        message:
          "Example org's Claude login needs a public https:// endpoint with a host name. Ask an admin to update the login on the Agents tab of the org settings.",
      },
    }),
  )
  await removePersonalLogin(harness, fixture.owner.id)
  const refused = await fixture.fetch(
    sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
    { id: 'refused', text: 'Cannot send', choice: CLAUDE, attachmentIds: [] },
  )
  expect(refused.status).toBe(409)
})
