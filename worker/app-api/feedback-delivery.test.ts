import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { feedbackDraft, feedbackFixture } from './feedback.test-support'
import { fillFeedbackQuota, quotaRows } from './feedback-quota.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('refunds clear refusals and retains the quota for unclear provider statuses', async () => {
  const client = await feedbackFixture(harness)
  await fillFeedbackQuota(client, 9, 'baseline')
  const baseline = await harness.env.DB.prepare(
    'SELECT id FROM feedback_sends WHERE user_id = ?',
  )
    .bind(client.member.user.id)
    .all<{ id: string }>()
  const baselineIds = JSON.stringify(baseline.results.map((row) => row.id))
  for (const [hour, status] of [403, 408, 409, 500].entries()) {
    client.setTime(TEST_TIME + hour * 3_600_000)
    await harness.env.DB.prepare(
      'UPDATE feedback_sends SET reserved_at = ? WHERE id IN (SELECT value FROM json_each(?))',
    )
      .bind(TEST_TIME + hour * 3_600_000, baselineIds)
      .run()
    client.resend.status = status
    const failed = await client.send({
      ...feedbackDraft(),
      draftId: `failed-${status}`,
    })
    expect(failed.status, String(status)).toBe(502)
    client.resend.status = null
    expect(
      (await client.send({ ...feedbackDraft(), draftId: `after-${status}` }))
        .status,
      String(status),
    ).toBe(status === 403 ? 204 : 429)
  }
})

it('does not refund an earlier ambiguous delivery when its retry is clearly refused', async () => {
  const client = await feedbackFixture(harness)
  client.resend.throwError = true
  expect((await client.send()).status).toBe(502)
  client.resend.throwError = false
  client.resend.refuse = true
  expect((await client.send()).status).toBe(502)
  client.resend.refuse = false
  await fillFeedbackQuota(client, 9)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'eleventh' })).status,
  ).toBe(429)
  expect((await quotaRows(client, harness.env.DB)).results[0]).toMatchObject({
    state: 'uncertain',
    activeRequests: 0,
  })
})

it('sends no email when a D1 claim fails and consumes no slot for missing configuration', async () => {
  const client = await feedbackFixture(harness)
  delete harness.env.FEEDBACK_EMAIL
  expect((await client.send()).status).toBe(503)
  harness.env.FEEDBACK_EMAIL = 'feedback-team@example.com'
  delete harness.env.RESEND_API_KEY
  expect((await client.send()).status).toBe(502)
  harness.env.RESEND_API_KEY = 'test-resend-secret'
  await harness.env.DB.prepare(
    `CREATE TRIGGER refuse_feedback_claim BEFORE INSERT ON feedback_sends
    BEGIN SELECT RAISE(ABORT, 'claim refused'); END`,
  ).run()
  try {
    expect((await client.send()).status).toBe(502)
    expect(client.resend.requests).toHaveLength(0)
    expect((await quotaRows(client, harness.env.DB)).results).toEqual([])
  } finally {
    await harness.env.DB.prepare('DROP TRIGGER refuse_feedback_claim').run()
  }
  await fillFeedbackQuota(client)
  expect((await client.send()).status).toBe(429)
})

it('retains a delivered reservation after failed completion bookkeeping and retries its exact key', async () => {
  const client = await feedbackFixture(harness)
  await harness.env.DB.prepare(
    `CREATE TRIGGER refuse_feedback_completion BEFORE UPDATE ON feedback_sends
    WHEN NEW.active_requests < OLD.active_requests
    BEGIN SELECT RAISE(ABORT, 'completion refused'); END`,
  ).run()
  try {
    expect((await client.send()).status).toBe(502)
    expect(client.resend.deliveryCount).toBe(1)
  } finally {
    await harness.env.DB.prepare(
      'DROP TRIGGER refuse_feedback_completion',
    ).run()
  }
  await fillFeedbackQuota(client, 9)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'eleventh' })).status,
  ).toBe(429)
  expect((await client.send()).status).toBe(204)
  expect(client.resend.requests[10].key).toBe(client.resend.requests[0].key)
  expect(client.resend.deliveryCount).toBe(10)
})

it('retains an orphaned pending epoch when its renewed retry is clearly refused', async () => {
  const client = await feedbackFixture(harness)
  await harness.env.DB.prepare(
    `CREATE TRIGGER refuse_feedback_completion BEFORE UPDATE ON feedback_sends
    WHEN NEW.active_requests < OLD.active_requests
    BEGIN SELECT RAISE(ABORT, 'completion refused'); END`,
  ).run()
  try {
    expect((await client.send()).status).toBe(502)
    expect(client.resend.deliveryCount).toBe(1)
  } finally {
    await harness.env.DB.prepare(
      'DROP TRIGGER refuse_feedback_completion',
    ).run()
  }
  expect((await quotaRows(client, harness.env.DB)).results).toEqual([
    {
      state: 'pending',
      firstAttemptAt: TEST_TIME,
      reservedAt: TEST_TIME,
      activeRequests: 1,
    },
  ])
  client.setTime(TEST_TIME + 3_600_000)
  client.resend.refuse = true
  expect((await client.send()).status).toBe(502)
  client.resend.refuse = false
  expect(client.resend.requests[1].key).toBe(client.resend.requests[0].key)
  await fillFeedbackQuota(client, 9)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'eleventh' })).status,
  ).toBe(429)
  const rows = (await quotaRows(client, harness.env.DB)).results
  expect(rows).toHaveLength(10)
  expect(rows[0]).toEqual({
    state: 'uncertain',
    firstAttemptAt: TEST_TIME,
    reservedAt: TEST_TIME + 3_600_000,
    activeRequests: 0,
  })
})

it('ignores an old completion after an unresolved key claims a new hourly generation', async () => {
  const client = await feedbackFixture(harness)
  const old = client.resend.hold()
  const oldSend = client.send()
  await old.entered
  client.setTime(TEST_TIME + 3_600_000)
  await fillFeedbackQuota(client, 9)
  const current = client.resend.hold()
  const currentSend = client.send()
  await current.entered
  old.reply(403)
  expect((await oldSend).status).toBe(502)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'blocked' })).status,
  ).toBe(429)
  current.reply(200)
  expect((await currentSend).status).toBe(204)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'still-blocked' }))
      .status,
  ).toBe(429)
})
