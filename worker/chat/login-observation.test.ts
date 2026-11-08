import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'

describe('committed session login observations', () => {
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

  it('publishes and keeps unavailable login state when the starter Send is refused', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      {
        id: 'refused-owner',
        text: 'Observe a removed login',
        choice: CLAUDE,
        attachmentIds: [],
      },
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: {
        code: 'agent_login_required',
        message: 'Connect your agent login to send a message.',
      },
    })
    const stored = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    )
    expect(stored?.loginAvailable).toBe(false)
    expect(ownerTab.messages.slice(1)).toEqual([
      {
        type: 'event',
        envelope: {
          workspaceId: WORKSPACE_ID,
          eventNumber: 2,
          occurredAt: TEST_TIME,
          event: {
            type: 'session.updated',
            session: { ...session, loginAvailable: false },
          },
        },
      },
    ])
    expect(memberTab.messages).toEqual(ownerTab.messages)
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.message('refused-owner'),
      ),
    ).toBeUndefined()
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toEqual([])
    expect(JSON.stringify(ownerTab.messages)).not.toContain('secret-')
    ownerTab.close()
    memberTab.close()
  })

  it('returns repeated message IDs without checking any login or publishing an observation', async () => {
    let refuseChecks = false
    let checks = 0
    const fixture = await createChatFixture(harness, {
      resolveLogin: async (_userId, agent) => {
        checks++
        if (refuseChecks) throw new Error('A repeated message checked a login')
        return { agent, kind: 'api-key', secret: 'test-login' }
      },
    })
    const session = await fixture.createSession()
    const accepted = await fixture.send(session.id, 'same-message')
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    checks = 0
    refuseChecks = true
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      {
        id: 'same-message',
        text: 'Check this code',
        choice: CLAUDE,
        attachmentIds: [],
      },
    )
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual(accepted)
    expect(checks).toBe(0)
    expect(ownerTab.messages).toHaveLength(1)
    expect(memberTab.messages).toEqual(ownerTab.messages)
    ownerTab.close()
    memberTab.close()
  })

  it('keeps the observation but no linked acceptance when an attachment is refused', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      {
        id: 'refused-attachment',
        text: 'Keep acceptance atomic',
        choice: CLAUDE,
        attachmentIds: ['missing-file'],
      },
      fixture.memberCookie,
    )
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'attachment_not_found',
        message: 'The attached file is not available. Upload it again.',
      },
    })
    const stored = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    )
    expect(stored?.loginAvailable).toBe(false)
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.sessions()),
    ).toHaveLength(1)
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.message('refused-attachment'),
      ),
    ).toBeUndefined()
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toEqual([])
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.turns()),
    ).toEqual([])
    expect(ownerTab.messages.slice(1)).toEqual([
      {
        type: 'event',
        envelope: {
          workspaceId: WORKSPACE_ID,
          eventNumber: 2,
          occurredAt: TEST_TIME,
          event: {
            type: 'session.updated',
            session: { ...session, loginAvailable: false },
          },
        },
      },
    ])
    expect(memberTab.messages).toEqual(ownerTab.messages)
    expect(JSON.stringify(ownerTab.messages)).not.toContain('secret-')
    ownerTab.close()
    memberTab.close()
  })
})
