import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { operatorApprovalPath } from '../../src/shared/operator-waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { accessRecord } from '../waitlist/waitlist.test-support'
import { operatorWaitlistFixture, operatorWrite } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('retains a failed email and retries from the scheduled entry with the same key and saved message', async () => {
  const client = await operatorWaitlistFixture(harness)
  client.refuseMail()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const response = await client.request(
      operatorApprovalPath(11),
      undefined,
      operatorWrite(),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      githubId: 11,
      changed: true,
      approvalEmail: { state: 'pending', updatedAt: TEST_TIME },
      emailFailed: true,
    })
    expect(await accessRecord(harness, client.member.user.id)).toMatchObject({
      source: 'approval',
    })
    expect(warning.mock.calls).toEqual([
      [
        {
          kind: 'approval_email_delivery_failed',
          message: 'Approval email delivery failed. The email remains pending.',
        },
      ],
    ])
    const repeat = await client.request(
      operatorApprovalPath(11),
      undefined,
      operatorWrite(),
    )
    expect(repeat.status).toBe(200)
    expect(await repeat.json()).toMatchObject({
      changed: false,
      approvalEmail: { state: 'pending' },
    })
    expect(client.requests).toHaveLength(1)
    await harness.env.DB.prepare(
      'UPDATE users SET primary_verified_email = ? WHERE id = ?',
    )
      .bind('changed@example.com', client.member.user.id)
      .run()
    client.refuseMail(false)
    client.setTime(TEST_TIME + 900_000)
    await client.scheduled()
    expect(client.requests).toHaveLength(2)
    expect(client.requests[1].headers.get('Idempotency-Key')).toBe(
      client.requests[0].headers.get('Idempotency-Key'),
    )
    expect(await client.requests[1].json()).toEqual(
      await client.requests[0].json(),
    )
    expect(
      await harness.env.DB.prepare(
        'SELECT state, updated_at AS updatedAt FROM approval_emails',
      ).first(),
    ).toEqual({ state: 'sent', updatedAt: TEST_TIME + 900_000 })
    await client.scheduled()
    expect(client.requests).toHaveLength(2)
  } finally {
    warning.mockRestore()
  }
})

it('retries before 24 hours and marks the email failed at 24 hours without another send', async () => {
  const client = await operatorWaitlistFixture(harness)
  client.refuseMail()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const response = await client.request(
      operatorApprovalPath(11),
      undefined,
      operatorWrite(),
    )
    expect(response.status).toBe(200)
    client.setTime(TEST_TIME + 86_400_000 - 1)
    await client.scheduled()
    expect(client.requests).toHaveLength(2)
    expect(
      await harness.env.DB.prepare('SELECT state FROM approval_emails').first(
        'state',
      ),
    ).toBe('pending')
    client.refuseMail(false)
    client.setTime(TEST_TIME + 86_400_000)
    await client.scheduled()
    expect(client.requests).toHaveLength(2)
    expect(
      await harness.env.DB.prepare(
        'SELECT state, updated_at AS updatedAt FROM approval_emails',
      ).first(),
    ).toEqual({ state: 'failed', updatedAt: TEST_TIME + 86_400_000 })
    client.setTime(TEST_TIME + 172_800_000)
    await client.scheduled()
    expect(client.requests).toHaveLength(2)
    expect(await accessRecord(harness, client.member.user.id)).toMatchObject({
      source: 'approval',
    })
  } finally {
    warning.mockRestore()
  }
})

it('rolls the approval and its pending email back when its referral code cannot be saved', async () => {
  const client = await operatorWaitlistFixture(harness)
  await harness.env.DB.prepare(
    `CREATE TRIGGER refuse_approval_referral BEFORE INSERT ON access_codes
    WHEN NEW.kind = 'referral' BEGIN SELECT RAISE(ABORT, 'referral refused'); END`,
  ).run()
  try {
    const response = await client.request(
      operatorApprovalPath(11),
      undefined,
      operatorWrite(),
    )
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      error: { code: 'internal_error' },
    })
    expect(await accessRecord(harness, client.member.user.id)).toBeNull()
    expect(
      await harness.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM approval_emails',
      ).first('count'),
    ).toBe(0)
    expect(client.requests).toHaveLength(0)
  } finally {
    await harness.env.DB.prepare('DROP TRIGGER refuse_approval_referral').run()
  }
})
