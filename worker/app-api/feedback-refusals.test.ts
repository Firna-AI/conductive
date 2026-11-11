import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { FEEDBACK_PATH } from '../../src/shared/feedback'
import {
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  feedbackDraft,
  feedbackFixture,
  feedbackText,
  imageContent,
} from './feedback.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('applies sign-in, origin, user suspension and app access checks before reading feedback', async () => {
  const client = await feedbackFixture(harness)
  const unsigned = streamedBody([new Uint8Array(10_000_001)])
  const signedOut = await client.fetch(
    streamedRequest(`${TEST_ORIGIN}${FEEDBACK_PATH}`, unsigned.body, {
      Origin: TEST_ORIGIN,
      'Content-Type': 'application/json',
    }),
  )
  expect(signedOut.status).toBe(401)
  expect(await signedOut.json()).toEqual({
    error: {
      code: 'sign_in_required',
      message: 'Sign in with GitHub to continue.',
    },
  })
  expect(unsigned.observed.bytes).toBe(0)
  const origin = await client.request(undefined, {
    method: 'POST',
    body: '{}',
    headers: { Origin: 'https://untrusted.example' },
  })
  expect(origin.status).toBe(403)
  expect(await origin.json()).toEqual({
    error: { code: 'origin_forbidden', message: 'Open the app to continue.' },
  })
  await harness.env.DB.prepare('DELETE FROM user_app_access WHERE user_id = ?')
    .bind(client.member.user.id)
    .run()
  const unread = streamedBody([new Uint8Array(10_000_001)])
  const waiting = await client.fetch(
    streamedRequest(`${TEST_ORIGIN}${FEEDBACK_PATH}`, unread.body, {
      Cookie: client.member.session,
      Origin: TEST_ORIGIN,
      'Content-Type': 'application/json',
    }),
  )
  expect(waiting.status).toBe(403)
  expect(await waiting.json()).toEqual({
    error: {
      code: 'access_required',
      message:
        'Your account is on the waitlist. Use an invite code to get access.',
    },
  })
  expect(unread.observed.bytes).toBe(0)
  const waitingRead = await client.request()
  expect(waitingRead.status).toBe(403)
  expect(await waitingRead.json()).toEqual({
    error: {
      code: 'access_required',
      message:
        'Your account is on the waitlist. Use an invite code to get access.',
    },
  })
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, client.admin.user.id)
    .run()
  const suspended = await client.send(feedbackDraft(), client.admin.session)
  expect(suspended.status).toBe(401)
  expect(await suspended.json()).toEqual({
    error: {
      code: 'sign_in_required',
      message: 'Sign in with GitHub to continue.',
    },
  })
  expect(client.resend.requests).toHaveLength(0)
})

it('refuses invalid messages, malformed or renamed images, and excess combined image bytes without sending', async () => {
  const client = await feedbackFixture(harness)
  const draft = feedbackDraft()
  const invalid = {
    status: 400,
    error: { code: 'invalid_input', message: 'Complete the required fields.' },
  }
  const image = {
    status: 400,
    error: {
      code: 'feedback_image_invalid',
      message: 'Add a PNG, JPEG, GIF, or WebP image.',
    },
  }
  const cases = [
    { name: 'blank message', body: { ...draft, text: ' \n\t ' }, ...invalid },
    { name: 'missing draft', body: { ...draft, draftId: '' }, ...invalid },
    { name: 'invalid context', body: { ...draft, context: [] }, ...invalid },
    {
      name: 'invalid Mac flag',
      body: { ...draft, context: { ...draft.context, desktop: 'yes' } },
      ...invalid,
    },
    {
      name: 'invalid screenshot list',
      body: { ...draft, screenshots: 'image' },
      ...invalid,
    },
    {
      name: 'missing screenshot content',
      body: { ...draft, screenshots: [{}] },
      ...image,
    },
    {
      name: 'malformed base64',
      body: { ...draft, screenshots: [{ content: '%%%' }] },
      ...image,
    },
    ...['<html>image</html>', '<svg><script/></svg>', 'MZprogram'].map(
      (content) => ({
        name: `renamed ${content}`,
        body: {
          ...draft,
          screenshots: [
            {
              content: btoa(content),
              name: 'screen.png',
              mediaType: 'image/png',
            },
          ],
        },
        ...image,
      }),
    ),
    {
      name: 'combined image limit',
      body: {
        ...draft,
        screenshots: [
          { content: imageContent('png', 3_500_000) },
          { content: imageContent('jpeg', 3_500_001) },
        ],
      },
      status: 413,
      error: {
        code: 'feedback_images_too_large',
        message: 'Together, the screenshots can be up to 7 MB.',
      },
    },
  ]
  for (const { name, body, status, error } of cases) {
    const response = await client.send(body)
    expect(response.status, name).toBe(status)
    expect(await response.json(), name).toEqual({ error })
  }
  const notJson = await client.request(undefined, {
    method: 'POST',
    body: '{}',
    headers: { 'Content-Type': 'text/plain' },
  })
  expect(notJson.status).toBe(415)
  expect(await notJson.json()).toEqual({
    error: { code: 'json_required', message: 'Send the request as JSON.' },
  })
  for (const body of ['{', '[]']) {
    const malformed = await client.request(undefined, { method: 'POST', body })
    expect(malformed.status).toBe(400)
    expect(await malformed.json()).toMatchObject({
      error: { code: 'invalid_json' },
    })
  }
  expect(client.resend.requests).toHaveLength(0)
})

it('reports missing inboxes and failed delivery without exposing provider data or logging feedback', async () => {
  const client = await feedbackFixture(harness)
  const info = vi.spyOn(console, 'info').mockImplementation(() => {})
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    client.resend.refuse = true
    const refused = await client.send()
    expect(refused.status).toBe(502)
    expect(await refused.json()).toEqual({
      error: {
        code: 'feedback_email_failed',
        message: 'The feedback email could not be sent. Try again.',
      },
    })
    client.resend.refuse = false
    client.resend.throwError = true
    const broken = await client.send()
    expect(broken.status).toBe(502)
    expect(await broken.json()).toEqual({
      error: {
        code: 'feedback_email_failed',
        message: 'The feedback email could not be sent. Try again.',
      },
    })
    delete harness.env.RESEND_API_KEY
    const missingKey = await client.send()
    expect(missingKey.status).toBe(502)
    expect(await missingKey.json()).toEqual({
      error: {
        code: 'feedback_email_failed',
        message: 'The feedback email could not be sent. Try again.',
      },
    })
    delete harness.env.FEEDBACK_EMAIL
    for (const origin of [TEST_ORIGIN, 'http://127.0.0.1:5173']) {
      const missingInbox = await client.send(feedbackDraft(), undefined, origin)
      expect(missingInbox.status, origin).toBe(503)
      expect(await missingInbox.json()).toEqual({
        error: {
          code: 'feedback_unavailable',
          message: 'Feedback is not available. Try again later.',
        },
      })
    }
    expect(client.resend.requests).toHaveLength(2)
    expect(client.resend.deliveries.size).toBe(0)
    expect(info.mock.calls).toEqual([])
    expect(warn.mock.calls).toEqual([])
    expect(error.mock.calls).toEqual([])
  } finally {
    info.mockRestore()
    warn.mockRestore()
    error.mockRestore()
  }
})

it('logs valid feedback on local app origins without a Resend key or real delivery', async () => {
  const client = await feedbackFixture(harness)
  delete harness.env.RESEND_API_KEY
  const log = vi.spyOn(console, 'info').mockImplementation(() => {})
  try {
    for (const origin of [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://[::1]:5173',
    ]) {
      const response = await client.send(feedbackDraft(), undefined, origin)
      expect(response.status, origin).toBe(204)
    }
    expect(client.resend.requests).toHaveLength(0)
    expect(client.resend.deliveries.size).toBe(0)
    expect(log.mock.calls).toEqual([
      [
        'Feedback email to feedback-team@example.com: Feedback from member\n' +
          feedbackText().replace(TEST_ORIGIN, 'http://127.0.0.1:5173'),
      ],
      [
        'Feedback email to feedback-team@example.com: Feedback from member\n' +
          feedbackText().replace(TEST_ORIGIN, 'http://localhost:5173'),
      ],
      [
        'Feedback email to feedback-team@example.com: Feedback from member\n' +
          feedbackText().replace(TEST_ORIGIN, 'http://[::1]:5173'),
      ],
    ])
  } finally {
    log.mockRestore()
  }
})
