import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import {
  markCreationFailed,
  registerCreationAttempt,
} from '../lifecycle/creation-attempt-data'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { lifecycleSnapshot } from './turn-lifecycle.test-support'

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

it('refuses later messages in every session before the first start succeeds and keeps accepted repeats', async () => {
  const fixture = await createChatFixture(harness)
  const first = await fixture.createSession()
  const accepted = await fixture.send(first.id, 'first-message')
  const other = await fixture.createSession(CLAUDE, fixture.memberCookie)
  await registerCreationAttempt(harness.env.DB, {
    id: WORKSPACE_ID,
    orgId: fixture.org.id,
    senderUserId: fixture.owner.id,
    messageId: 'first-message',
    now: TEST_TIME,
  })
  fixture.restart()
  const before = await lifecycleSnapshot(fixture)
  const histories = await Promise.all([
    fixture.history(first.id),
    fixture.history(other.id),
  ])
  expect(await fixture.send(first.id, 'first-message')).toEqual(accepted)
  for (const [sessionId, cookie] of [
    [first.id, fixture.ownerCookie],
    [other.id, fixture.memberCookie],
  ]) {
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, sessionId),
      {
        id: `later-${sessionId}`,
        text: 'Keep this draft until the first start succeeds',
        attachmentIds: [],
        choice: CLAUDE,
      },
      cookie,
    )
    expect(response.status, sessionId).toBe(409)
    expect(await response.json(), sessionId).toEqual({
      error: {
        code: 'workspace_starting',
        message:
          'Wait for the workspace to start before sending another message.',
      },
    })
  }
  await markCreationFailed(harness.env.DB, WORKSPACE_ID)
  const failed = await fixture.fetch(
    sessionPaths.messages(fixture.org.id, WORKSPACE_ID, first.id),
    {
      id: 'during-cleanup',
      text: 'Keep this text while the failed workspace is removed',
      attachmentIds: [],
      choice: CLAUDE,
    },
  )
  expect(failed.status).toBe(409)
  expect(await failed.json()).toEqual({
    error: {
      code: 'workspace_starting',
      message:
        'Wait for the workspace to start before sending another message.',
    },
  })
  expect(await fixture.send(first.id, 'first-message')).toEqual(accepted)
  expect(await lifecycleSnapshot(fixture)).toEqual(before)
  expect(
    await Promise.all([fixture.history(first.id), fixture.history(other.id)]),
  ).toEqual(histories)
})
