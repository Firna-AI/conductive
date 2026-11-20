import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { FEEDBACK_PATH } from '../../src/shared/feedback'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { heldOperation } from '../test-support/held-operation'
import { feedbackDraft, feedbackFixture } from './feedback.test-support'
import { fillFeedbackQuota } from './feedback-quota.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('admits only one of two simultaneous new drafts for the last slot', async () => {
  const client = await feedbackFixture(harness)
  await fillFeedbackQuota(client, 9)
  const responses = await Promise.all([
    client.send({ ...feedbackDraft(), draftId: 'last-a' }),
    client.send({ ...feedbackDraft(), draftId: 'last-b' }),
  ])
  expect(responses.map((response) => response.status).sort()).toEqual([
    204, 429,
  ])
  expect(client.resend.deliveryCount).toBe(10)
})

it('keeps an overlapping claim until every clear refusal ends and keeps a later success charged', async () => {
  const client = await feedbackFixture(harness)
  await fillFeedbackQuota(client, 9)
  const first = client.resend.hold()
  const second = client.resend.hold()
  const sendingFirst = client.send()
  await first.entered
  const sendingSecond = client.send()
  await second.entered
  first.reply(403)
  expect((await sendingFirst).status).toBe(502)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'blocked' })).status,
  ).toBe(429)
  second.reply(200)
  expect((await sendingSecond).status).toBe(204)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'still-blocked' }))
      .status,
  ).toBe(429)

  await fillFeedbackQuota(client, 9, 'admin', client.admin.session)
  const third = client.resend.hold()
  const fourth = client.resend.hold()
  const sendingThird = client.send(feedbackDraft(), client.admin.session)
  await third.entered
  const sendingFourth = client.send(feedbackDraft(), client.admin.session)
  await fourth.entered
  third.reply(403)
  expect((await sendingThird).status).toBe(502)
  expect(
    (
      await client.send(
        { ...feedbackDraft(), draftId: 'admin-blocked' },
        client.admin.session,
      )
    ).status,
  ).toBe(429)
  fourth.reply(403)
  expect((await sendingFourth).status).toBe(502)
  expect(
    (
      await client.send(
        { ...feedbackDraft(), draftId: 'admin-open' },
        client.admin.session,
      )
    ).status,
  ).toBe(204)
})

it('claims only the earlier current epoch when D1 receives boundary requests out of time order', async () => {
  const client = await feedbackFixture(harness)
  expect((await client.send()).status).toBe(204)
  const delayed = heldOperation()
  let firstBatch = true
  const db = harness.env.DB
  const delayedDb = new Proxy(db, {
    get(target, property, receiver) {
      if (property !== 'batch') return Reflect.get(target, property, receiver)
      return async (statements: D1PreparedStatement[]) => {
        if (firstBatch) {
          firstBatch = false
          await delayed.wait()
        }
        return target.batch(statements)
      }
    },
  })
  client.setTime(TEST_TIME + 86_400_000 - 1)
  const oldSend = client.fetch(
    new Request(`${TEST_ORIGIN}${FEEDBACK_PATH}`, {
      method: 'POST',
      headers: {
        Cookie: client.member.session,
        Origin: TEST_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackDraft()),
    }),
    { ...harness.env, DB: delayedDb },
  )
  await delayed.entered
  client.setTime(TEST_TIME + 86_400_000)
  const provider = client.resend.hold()
  const newSend = client.send()
  await provider.entered
  try {
    delayed.release()
    expect((await oldSend).status).toBe(204)
    expect(client.resend.requests).toHaveLength(2)
  } finally {
    delayed.release()
    provider.reply(403)
    await newSend
  }
  expect((await newSend).status).toBe(502)
  await fillFeedbackQuota(client)
})
