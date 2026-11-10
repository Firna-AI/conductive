import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import type { SendMessageResponse } from '../../src/shared/messages'
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
it('stores later messages in every session during a first start and its failure and keeps accepted repeats', async () => {
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
  await fixture.restart()
  expect(await fixture.send(first.id, 'first-message')).toEqual({
    ...accepted,
    eventNumber: 4,
  })
  for (const [sessionId, cookie] of [
    [first.id, fixture.ownerCookie],
    [other.id, fixture.memberCookie],
  ]) {
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, sessionId),
      {
        id: `later-${sessionId}`,
        text: 'Queued work',
        attachmentIds: [],
        choice: CLAUDE,
      },
      cookie,
    )
    expect(response.status).toBe(202)
    const accepted: SendMessageResponse = await response.json()
    expect(accepted.message).toMatchObject({
      id: `later-${sessionId}`,
      state: 'queued',
    })
  }
  await markCreationFailed(harness.env.DB, WORKSPACE_ID)
  const failed = await fixture.send(first.id, 'during-cleanup')
  expect(failed.message).toMatchObject({
    id: 'during-cleanup',
    state: 'queued',
  })
  const history = await fixture.history(first.id)
  await fixture.restart()
  expect(await fixture.send(first.id, 'first-message')).toEqual({
    ...accepted,
    eventNumber: failed.eventNumber,
  })
  expect(await fixture.history(first.id)).toEqual(history)
})
