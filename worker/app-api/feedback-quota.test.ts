import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { invitesPath } from '../../src/shared/members'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
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

it('limits feedback per person while invitations and reply reads stay outside the quota', async () => {
  const client = await feedbackFixture(harness)
  client.setTime(TEST_TIME + 1)
  const invite = (email: string) =>
    client.fetch(
      new Request(`${TEST_ORIGIN}${invitesPath(client.org.id)}`, {
        method: 'POST',
        headers: {
          Cookie: client.admin.session,
          Origin: TEST_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      }),
    )
  expect((await invite('first@example.com')).status).toBe(201)
  await fillFeedbackQuota(client, 10, 'admin', client.admin.session)
  const refused = await client.send(feedbackDraft(), client.admin.session)
  expect(refused.status).toBe(429)
  expect(await refused.json()).toEqual({
    error: {
      code: 'feedback_send_limit',
      message:
        'You can send up to 10 feedback messages an hour. Try again at 09:01 UTC.',
      retryAt: 1_800_003_600_001,
    },
  })
  expect(client.resend.requests).toHaveLength(11)
  expect((await invite('second@example.com')).status).toBe(201)
  expect((await client.send()).status).toBe(204)
  expect((await client.request(client.admin.session)).status).toBe(200)
  expect(client.resend.requests).toHaveLength(13)
})

it('expires only the oldest rolling-hour send at the exact boundary', async () => {
  const client = await feedbackFixture(harness)
  for (let minute = 0; minute < 10; minute++) {
    client.setTime(TEST_TIME + minute * 60_000)
    expect(
      (await client.send({ ...feedbackDraft(), draftId: `minute-${minute}` }))
        .status,
    ).toBe(204)
  }
  client.setTime(TEST_TIME + 3_600_000 - 1)
  const early = await client.send()
  expect(early.status).toBe(429)
  expect(await early.json()).toMatchObject({
    error: { retryAt: 1_800_003_600_000 },
  })
  client.setTime(TEST_TIME + 3_600_000)
  expect((await client.send()).status).toBe(204)
  const next = await client.send({ ...feedbackDraft(), draftId: 'next' })
  expect(next.status).toBe(429)
  expect(await next.json()).toMatchObject({
    error: { retryAt: 1_800_003_660_000 },
  })
  expect(client.resend.deliveryCount).toBe(11)
})

it('reuses a lost-reply slot at capacity and answers confirmed retries without another provider call', async () => {
  const client = await feedbackFixture(harness)
  client.resend.loseReply = true
  expect((await client.send()).status).toBe(502)
  await fillFeedbackQuota(client, 9)
  expect((await client.send()).status).toBe(204)
  expect(client.resend.requests[10].key).toBe(client.resend.requests[0].key)
  expect(client.resend.requests[10].body).toBe(client.resend.requests[0].body)
  expect(client.resend.deliveryCount).toBe(10)
  expect((await client.send()).status).toBe(204)
  expect(client.resend.requests).toHaveLength(11)
  for (const changed of [
    { ...feedbackDraft(), text: 'Changed text' },
    { ...feedbackDraft(), draftId: 'changed-draft' },
  ])
    expect((await client.send(changed)).status).toBe(429)
  expect(client.resend.requests).toHaveLength(11)
})

it('applies the same quota before local feedback logging', async () => {
  const client = await feedbackFixture(harness)
  delete harness.env.RESEND_API_KEY
  const log = vi.spyOn(console, 'info').mockImplementation(() => {})
  try {
    for (let index = 0; index < 10; index++)
      expect(
        (
          await client.send(
            { ...feedbackDraft(), draftId: `local-${index}` },
            undefined,
            'http://localhost:5173',
          )
        ).status,
      ).toBe(204)
    const limited = await client.send(
      feedbackDraft(),
      undefined,
      'http://localhost:5173',
    )
    expect(limited.status).toBe(429)
    expect(log).toHaveBeenCalledTimes(10)
    expect(client.resend.requests).toHaveLength(0)
  } finally {
    log.mockRestore()
  }
})
