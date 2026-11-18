import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { sessionsPath, type SessionsResponse } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { preferChatOrgLogin, saveChatOrgLogin } from './org-login.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('publishes the starter default owner to another member before fixing the login at acceptance', async () => {
  const fixture = await createChatFixture(harness)
  const empty = await fixture.createSession()
  expect(empty.defaultLogin).toEqual({
    type: 'personal',
    userId: fixture.owner.id,
  })
  await saveChatOrgLogin(harness, fixture, {
    endpoint: 'https://org-models.example/private',
  })
  await preferChatOrgLogin(harness, fixture, true)
  const tab = await fixture.tab(0, undefined, fixture.memberCookie)
  const response = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
    undefined,
    fixture.memberCookie,
  )
  expect(response.status).toBe(200)
  const body: SessionsResponse = await response.json()
  const login = { type: 'org', orgId: fixture.org.id }
  expect(body.sessions).toEqual([
    { ...empty, defaultLogin: login, loginAvailable: true, loginShared: true },
  ])
  expect(body.sessions[0].login).toBeUndefined()
  expect(
    (await fixture.history(empty.id)).events.map(({ event }) => event),
  ).toContainEqual({ type: 'session.updated', session: body.sessions[0] })
  expect(JSON.stringify(body)).not.toContain('org-key')
  expect(JSON.stringify(body)).not.toContain('org-models.example')
  await tab.close()
  const accepted = await fixture.send(
    empty.id,
    'org-first-message',
    fixture.memberCookie,
  )
  expect(accepted.session).toMatchObject({
    id: empty.id,
    login,
    startedBy: { id: fixture.owner.id },
  })
  expect(accepted.session.defaultLogin).toBeUndefined()
})

it.each(['left', 'suspended'] as const)(
  'clears an empty session default when its starter is %s and links the next sender',
  async (state) => {
    const fixture = await createChatFixture(harness)
    await saveChatOrgLogin(harness, fixture)
    await preferChatOrgLogin(harness, fixture, true)
    const empty = await fixture.createSession()
    await harness.env.DB.prepare(
      'UPDATE workspaces SET owner_user_id = ? WHERE id = ?',
    )
      .bind(fixture.member.id, WORKSPACE_ID)
      .run()
    if (state === 'left') {
      await harness.env.DB.prepare(
        'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(fixture.org.id, fixture.owner.id)
        .run()
    } else {
      await harness.env.DB.prepare(
        'UPDATE users SET suspended_at = ? WHERE id = ?',
      )
        .bind(fixture.clock.now(), fixture.owner.id)
        .run()
    }
    const tab = await fixture.tab(0, undefined, fixture.memberCookie)
    const response = await fixture.fetch(
      sessionsPath(fixture.org.id, WORKSPACE_ID),
      undefined,
      fixture.memberCookie,
    )
    expect(response.status).toBe(200)
    const body: SessionsResponse = await response.json()
    expect(body.sessions).toHaveLength(1)
    expect(body.sessions[0]).toMatchObject({
      id: empty.id,
      loginAvailable: false,
      loginShared: false,
    })
    expect(body.sessions[0].defaultLogin).toBeUndefined()
    expect(body.sessions[0].login).toBeUndefined()
    await tab.close()
    const accepted = await fixture.send(
      empty.id,
      'member-first-message',
      fixture.memberCookie,
    )
    expect(accepted.session).toMatchObject({
      sourceSessionId: empty.id,
      login: { type: 'org', orgId: fixture.org.id },
      startedBy: { id: fixture.member.id },
    })
    expect(accepted.session.id).not.toBe(empty.id)
  },
)
