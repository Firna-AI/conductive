import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createApp } from '../application'
import { operatorApprovalPath } from '../../src/shared/operator-waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { operatorWaitlistFixture, operatorWrite } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('logs the approval email in local development without sending it to Resend', async () => {
  const client = await operatorWaitlistFixture(harness)
  const origin = 'http://127.0.0.1:5173'
  const env = { ...harness.env, APP_ORIGIN: origin }
  const requests: Request[] = []
  const app = createApp({
    now: () => TEST_TIME,
    fetch: async (request) => {
      requests.push(request)
      return new Response(null)
    },
  })
  const log = vi.spyOn(console, 'info').mockImplementation(() => {})
  try {
    const response = await app.fetch(
      new Request(`${origin}${operatorApprovalPath(11)}`, {
        ...operatorWrite(),
        headers: {
          Cookie: client.admin.session,
          Origin: origin,
          'Content-Type': 'application/json',
        },
      }),
      env,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      approvalEmail: { state: 'sent', updatedAt: TEST_TIME },
      emailFailed: false,
    })
    expect(requests).toHaveLength(0)
    expect(log.mock.calls).toEqual([
      [
        'Approval email to member@example.com: Your Conductive account is ready\nYou can now use Conductive. Sign in with GitHub to get started:\nhttps://app.conductive.build/',
      ],
    ])
  } finally {
    log.mockRestore()
  }
})
