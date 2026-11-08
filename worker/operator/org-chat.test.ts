import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { chatHistoryPath } from '../../src/shared/events'
import {
  sessionsPath,
  sessionPath,
  sessionPaths,
} from '../../src/shared/sessions'
import {
  createChatFixture,
  WORKSPACE_ID,
  CLAUDE,
} from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'

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

it('makes suspended org chat read-only and keeps its stored history available', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(session.id)
  const before = await fixture.history(session.id)
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(fixture.org.id)
    .run()
  for (const [path, body, method] of [
    [sessionsPath(fixture.org.id, WORKSPACE_ID), { choice: CLAUDE }, 'POST'],
    [
      sessionPath(fixture.org.id, WORKSPACE_ID, session.id),
      { title: 'Changed' },
      'PATCH',
    ],
    [
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      { id: 'after', text: 'Changed', choice: CLAUDE, attachmentIds: [] },
      'POST',
    ],
    [
      sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
      { stopRunningTurn: true },
      'POST',
    ],
  ] as const) {
    const response = await fixture.fetch(
      path,
      body,
      fixture.memberCookie,
      method,
    )
    expect([path, response.status]).toEqual([path, 403])
    expect(await response.json()).toMatchObject({
      error: { code: 'org_suspended' },
    })
  }
  const history = await fixture.fetch(
    chatHistoryPath(fixture.org.id, WORKSPACE_ID, session.id),
  )
  expect(history.status).toBe(200)
  expect(await history.json()).toEqual(before)
  expect(
    (await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))).status,
  ).toBe(200)
})
