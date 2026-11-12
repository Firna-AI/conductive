import { Buffer } from 'node:buffer'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { FEEDBACK_PATH } from '../../src/shared/feedback'
import {
  oversizedError,
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import {
  feedbackDraft,
  feedbackFixture,
  imageContent,
  type FeedbackFixture,
} from './feedback.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('accepts the 10 MB JSON boundary and refuses one extra byte with and without Content-Length', async () => {
  const client = await feedbackFixture(harness)
  for (const declared of [false, true]) {
    const accepted = await sendSizedFeedback(client, 10_000_000, declared)
    expect(accepted.response.status, `declared: ${declared}`).toBe(204)
    const oversized = await sendSizedFeedback(client, 10_000_001, declared)
    expect(oversized.response.status, `declared: ${declared}`).toBe(413)
    expect(await oversized.response.json()).toEqual(oversizedError)
    expect(oversized.observed.cancelled).toBe(1)
  }
  expect(client.resend.requests).toHaveLength(2)
  expect(client.resend.deliveries.size).toBe(1)
})

async function sendSizedFeedback(
  client: FeedbackFixture,
  size: number,
  declared: boolean,
) {
  const base = JSON.stringify({ ...feedbackDraft(), ignoredPadding: '' })
  const payload = JSON.stringify({
    ...feedbackDraft(),
    ignoredPadding: 'x'.repeat(size - base.length),
  })
  const bytes = new TextEncoder().encode(payload)
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < bytes.length; offset += 65_536)
    chunks.push(bytes.subarray(offset, offset + 65_536))
  const stream = streamedBody(chunks)
  const headers = new Headers({
    Cookie: client.member.session,
    Origin: TEST_ORIGIN,
    'Content-Type': 'application/json',
  })
  if (declared) headers.set('Content-Length', '1')
  const response = await client.fetch(
    streamedRequest(`${TEST_ORIGIN}${FEEDBACK_PATH}`, stream.body, headers),
  )
  return { response, observed: stream.observed }
}

it('delivers an accepted 7 MB screenshot through real base64 decoding and mail encoding', async () => {
  const client = await feedbackFixture(harness)
  const content = imageContent('png', 7_000_000)
  const response = await client.send({
    ...feedbackDraft(),
    screenshots: [{ content }],
  })
  expect(response.status).toBe(204)
  expect(client.resend.deliveries.size).toBe(1)
  const mail: {
    attachments: { filename: string; content_type: string; content: string }[]
  } = JSON.parse(client.resend.requests[0].body)
  expect(mail.attachments).toEqual([
    { filename: 'screenshot-1.png', content_type: 'image/png', content },
  ])
  expect(Buffer.from(mail.attachments[0].content, 'base64').length).toBe(
    7_000_000,
  )
})
