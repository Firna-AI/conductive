import { Buffer } from 'node:buffer'

import {
  FEEDBACK_PATH,
  type SendFeedbackRequest,
} from '../../src/shared/feedback'
import { createApp } from '../application'
import type { AppEnv, HttpFetch } from '../env'
import { memberFixture } from '../members/members-test-support'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'

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

class FakeFeedbackResend {
  requests: { request: Request; body: string; key: string }[] = []
  deliveries = new Map<string, { id: string; body: string }>()
  refuse = false
  loseReply = false
  throwError = false

  fetch: HttpFetch = async (request) => {
    const body = await request.text()
    const key = request.headers.get('Idempotency-Key') ?? ''
    this.requests.push({ request, body, key })
    if (this.throwError) throw new Error('private-provider-error')
    if (!key || key.length > 256)
      return Response.json({ message: 'Invalid key' }, { status: 400 })
    if (this.refuse)
      return Response.json(
        { message: 'private-provider-refusal' },
        { status: 403 },
      )
    let delivery = this.deliveries.get(key)
    if (delivery && delivery.body !== body)
      return Response.json(
        { message: 'Different body for this key' },
        { status: 409 },
      )
    if (!delivery) {
      delivery = { id: `feedback-email-${this.deliveries.size + 1}`, body }
      this.deliveries.set(key, delivery)
    }
    if (this.loseReply) {
      this.loseReply = false
      throw new Error('Connection closed after delivery')
    }
    return Response.json({ id: delivery.id })
  }
}

export async function feedbackFixture(harness: TestHarness) {
  const fixture = await memberFixture(harness)
  harness.env.FEEDBACK_EMAIL = 'feedback-team@example.com'
  harness.env.RESEND_API_KEY = 'test-resend-secret'
  let now = TEST_TIME
  const resend = new FakeFeedbackResend()
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
