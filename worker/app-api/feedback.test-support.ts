import { Buffer } from 'node:buffer'

import {
  FEEDBACK_PATH,
  type SendFeedbackRequest,
} from '../../src/shared/feedback'
import { createApp } from '../application'
import type { AppEnv } from '../env'
import { memberFixture } from '../members/members-test-support'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { FakeFeedbackResend } from './feedback-resend.test-support'

export const screenshotSignatures = {
  png: [137, 80, 78, 71, 13, 10, 26, 10],
  jpeg: [255, 216, 255],
  gif: [71, 73, 70, 56, 57, 97],
  webp: [82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80],
} as const

export function imageContent(
  kind: keyof typeof screenshotSignatures = 'png',
  size: number = screenshotSignatures[kind].length,
) {
  const bytes = Buffer.alloc(size)
  bytes.set(screenshotSignatures[kind])
  return bytes.toString('base64')
}

export function feedbackDraft(): SendFeedbackRequest {
  return {
    draftId: 'feedback-draft-one',
    text: 'The terminal closes when I open a preview.',
    context: {
      orgId: null,
      workspaceId: null,
      appVersion: '0.5.0 (abcd123)',
      desktop: false,
    },
    screenshots: [],
  }
}

export async function feedbackFixture(harness: TestHarness) {
  const fixture = await memberFixture(harness)
  harness.env.FEEDBACK_EMAIL = 'feedback-team@example.com'
  harness.env.RESEND_API_KEY = 'test-resend-secret'
  let now = TEST_TIME
  const resend = new FakeFeedbackResend(() => now)
  const app = createApp({ now: () => now, fetch: resend.fetch })
  const fetch = (request: Request, env: AppEnv = harness.env) =>
    app.fetch(request, env)
  const request = (
    session = fixture.member.session,
    init: RequestInit = {},
    origin = TEST_ORIGIN,
  ) => {
    const headers = new Headers(init.headers)
    headers.set('Cookie', session)
    if (!headers.has('Origin')) headers.set('Origin', origin)
    if (init.body && !headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json')
    return fetch(new Request(`${origin}${FEEDBACK_PATH}`, { ...init, headers }))
  }
  const send = (
    body: unknown = feedbackDraft(),
    session = fixture.member.session,
    origin = TEST_ORIGIN,
  ) => request(session, { method: 'POST', body: JSON.stringify(body) }, origin)
  return {
    ...fixture,
    resend,
    fetch,
    request,
    send,
    scheduled: () =>
      app.scheduled(
        { cron: '*/15 * * * *', scheduledTime: now, noRetry() {} },
        harness.env,
      ),
    setTime(value: number) {
      now = value
      harness.setTime(value)
    },
  }
}

export type FeedbackFixture = Awaited<ReturnType<typeof feedbackFixture>>

export function feedbackText(
  context: string[] = [],
  desktop = false,
  browser = 'Unknown',
) {
  return [
    'The terminal closes when I open a preview.',
    '',
    'Context',
    'User ID: members-member',
    'GitHub login: member',
    'GitHub ID: 11',
    `User: ${TEST_ORIGIN}/operator/users/11`,
    ...context,
    'App version: 0.5.0 (abcd123)',
    `Mac app: ${desktop ? 'Yes' : 'No'}`,
    `Browser: ${browser}`,
  ].join('\n')
}
