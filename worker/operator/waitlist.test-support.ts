import { createApp } from '../application'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { waitlistFixture } from '../waitlist/waitlist.test-support'

export async function operatorWaitlistFixture(harness: TestHarness) {
  const fixture = await waitlistFixture(harness)
  harness.env.OPERATOR_GITHUB_IDS = '10'
  harness.env.RESEND_API_KEY = 'test-resend-secret'
  await harness.env.DB.prepare(
    'UPDATE users SET primary_verified_email = ?, github_created_at = ? WHERE id = ?',
  )
    .bind('member@example.com', 1_400_000_000_000, fixture.member.user.id)
    .run()
  let now = TEST_TIME
  let refused = false
  const requests: Request[] = []
  const app = createApp({
    now: () => now,
    fetch: async (request) => {
      if (new URL(request.url).hostname === 'api.resend.com') {
        requests.push(request.clone())
        return Response.json({ id: 'email-1' }, { status: refused ? 503 : 200 })
      }
      return new URL(request.url).hostname === 'boat.dev'
        ? harness.boat.fetch(request)
        : harness.github.fetch(request)
    },
  })
  return {
    ...fixture,
    requests,
    request(
      path: string,
      session = fixture.admin.session,
      init: RequestInit = {},
    ) {
      const headers = new Headers(init.headers)
      headers.set('Cookie', session)
      headers.set('Origin', TEST_ORIGIN)
      if (init.body) headers.set('Content-Type', 'application/json')
      return app.fetch(
        new Request(`${TEST_ORIGIN}${path}`, { ...init, headers }),
        harness.env,
      )
    },
    async scheduled() {
      await app.scheduled(
        { cron: '*/15 * * * *', scheduledTime: now, noRetry() {} },
        harness.env,
      )
    },
    setTime(value: number) {
      now = value
      harness.setTime(value)
    },
    refuseMail(value = true) {
      refused = value
    },
  }
}

export const operatorWrite = (
  body: unknown = {},
  method = 'POST',
): RequestInit => ({
  method,
  body: JSON.stringify(body),
})
