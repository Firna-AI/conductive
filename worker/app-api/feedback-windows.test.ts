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

it('requires a fresh hourly slot for an unresolved retry without changing its provider key', async () => {
  const client = await feedbackFixture(harness)
  client.resend.throwError = true
  expect((await client.send()).status).toBe(502)
  client.resend.throwError = false
  for (let minute = 0; minute < 10; minute++) {
    client.setTime(TEST_TIME + 3_600_000 + minute * 60_000)
    await fillFeedbackQuota(client, 1, `later-${minute}`)
  }
  expect((await client.send()).status).toBe(429)
  expect(client.resend.requests).toHaveLength(11)
  client.setTime(TEST_TIME + 7_200_000)
  expect((await client.send()).status).toBe(204)
  expect(client.resend.requests[11].key).toBe(client.resend.requests[0].key)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'now-full' })).status,
  ).toBe(429)
})

it('ends confirmed local retries at 24 hours and requires a new slot before another delivery', async () => {
  const client = await feedbackFixture(harness)
  expect((await client.send()).status).toBe(204)
  client.setTime(TEST_TIME + 86_400_000 - 1)
  await fillFeedbackQuota(client)
  expect((await client.send()).status).toBe(204)
  expect(client.resend.requests).toHaveLength(11)
  client.setTime(TEST_TIME + 86_400_000)
  expect((await client.send()).status).toBe(429)
  expect(client.resend.requests).toHaveLength(11)
  client.setTime(TEST_TIME + 90_000_000 - 1)
  expect((await client.send()).status).toBe(204)
  expect(client.resend.requests[11].key).toBe(client.resend.requests[0].key)
  expect(client.resend.deliveryCount).toBe(12)
})

it('keeps a late unresolved reservation across the 24-hour epoch boundary', async () => {
  const client = await feedbackFixture(harness)
  client.resend.throwError = true
  expect((await client.send()).status).toBe(502)
  client.setTime(TEST_TIME + 86_400_000 - 1)
  expect((await client.send()).status).toBe(502)
  client.resend.throwError = false
  client.setTime(TEST_TIME + 86_400_000)
  await fillFeedbackQuota(client, 9)
  expect((await client.send()).status).toBe(429)
  client.setTime(TEST_TIME + 90_000_000 - 1)
  expect((await client.send()).status).toBe(204)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'eleventh' })).status,
  ).toBe(429)
  expect((await quotaRows(client, harness.env.DB)).results).toHaveLength(11)
})

it('cleans expired epochs only after their hourly reservations end and cascades account deletion', async () => {
  const client = await feedbackFixture(harness)
  client.resend.throwError = true
  expect((await client.send()).status).toBe(502)
  client.resend.throwError = false
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'old-confirmed' }))
      .status,
  ).toBe(204)
  client.setTime(TEST_TIME + 86_400_000 - 1)
  client.resend.throwError = true
  expect((await client.send()).status).toBe(502)
  client.resend.throwError = false
  client.setTime(TEST_TIME + 86_400_000)
  expect(
    (await client.send({ ...feedbackDraft(), draftId: 'new-confirmed' }))
      .status,
  ).toBe(204)
  await client.scheduled()
  expect(
    (await quotaRows(client, harness.env.DB)).results.map((row) => row.state),
  ).toEqual(['uncertain', 'sent'])
  client.setTime(TEST_TIME + 90_000_000 - 1)
  await client.scheduled()
  expect(
    (await quotaRows(client, harness.env.DB)).results.map((row) => row.state),
  ).toEqual(['sent'])
  await harness.env.DB.batch([
    harness.env.DB.prepare('DELETE FROM org_members WHERE user_id = ?').bind(
      client.member.user.id,
    ),
    harness.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(
      client.member.user.id,
    ),
  ])
  expect((await quotaRows(client, harness.env.DB)).results).toEqual([])
})
