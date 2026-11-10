import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionsPath } from '../../src/shared/sessions'
import type { FirstWorkspaceMessage } from '../lifecycle/workspace-runtime'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { createFirstMessageFixture } from './first-message.test-support'
import { sessionRecord } from './retry.test-support'

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

it('refuses an unassigned first-message sender without storing a session or spending the assigned sender login', async () => {
  const fixture = await createChatFixture(harness)
  const first: FirstWorkspaceMessage = {
    workspaceId: WORKSPACE_ID,
    sessionId: 'first-session',
    turnId: 'first-turn',
    sender: {
      id: fixture.owner.id,
      githubId: 7,
      githubLogin: 'octocat',
      displayName: 'Octocat',
      avatarUrl: null,
    },
    request: {
      id: 'first-message',
      text: 'Keep the assigned sender',
      choice: CLAUDE,
      attachmentIds: [],
    },
  }
  await harness.env.DB.prepare(
    `INSERT INTO workspace_runtime
    (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      first.workspaceId,
      fixture.org.id,
      fixture.owner.id,
      first.sessionId,
      first.turnId,
      CLAUDE.agent,
      CLAUDE.model,
      CLAUDE.effort,
      first.request.id,
    )
    .run()
  await expect(
    fixture.chat.runLifecycle(() =>
      fixture.chat.acceptFirstMessage({
        ...first,
        sender: { ...first.sender, id: fixture.member.id },
      }),
    ),
  ).rejects.toMatchObject({
    status: 404,
    code: 'workspace_not_found',
    message: 'The workspace is not available.',
  })
  const sessions = await fixture.fetch(
    sessionsPath(fixture.org.id, WORKSPACE_ID),
  )
  expect(sessions.status).toBe(200)
  expect(await sessions.json()).toEqual({
    eventNumber: 0,
    sessions: [],
    history: [],
  })
  expect(await fixture.chat.workspaceSummary(WORKSPACE_ID)).toEqual({
    throughEventNumber: 0,
    lastOutputEventNumber: 0,
    working: false,
  })
})

it('starts the assigned first session untitled and keeps repeated admission unchanged', async () => {
  const { fixture, first, acceptFirst } =
    await createFirstMessageFixture(harness)
  const ownerTab = await fixture.tab()
  const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
  const accepted = await acceptFirst()
  expect((await sessionRecord(fixture, first.sessionId)).title).toBeNull()
  const history = await fixture.history(first.sessionId)
  expect(history.events.map(({ event }) => event.type)).toEqual([
    'session.updated',
    'message.accepted',
    'session.updated',
  ])
  expect(history.events[0].event).toMatchObject({
    type: 'session.updated',
    session: { id: first.sessionId, title: null },
  })
  expect(memberTab.messages).toEqual(ownerTab.messages)
  await fixture.restart()
  expect(await acceptFirst()).toEqual(accepted)
  expect(await fixture.history(first.sessionId)).toEqual(history)
  await ownerTab.close()
  await memberTab.close()
})
