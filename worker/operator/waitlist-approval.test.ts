import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { operatorUserPath } from '../../src/shared/operator'
import {
  operatorApprovalPath,
  type OperatorApprovalResponse,
} from '../../src/shared/operator-waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { accessRecord, setPaused } from '../waitlist/waitlist.test-support'
import { operatorWaitlistFixture, operatorWrite } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('approves during the pause once, saves the source and sends one plain text email', async () => {
  const client = await operatorWaitlistFixture(harness)
  await setPaused(harness)
  const path = operatorApprovalPath(11)
  const response = await client.request(path, undefined, operatorWrite())
  expect(response.status).toBe(200)
  const result: OperatorApprovalResponse = await response.json()
  expect(result).toEqual({
    githubId: 11,
    changed: true,
    approvalEmail: { state: 'sent', updatedAt: TEST_TIME },
    emailFailed: false,
  })
  expect(await accessRecord(harness, client.member.user.id)).toEqual({
    grantedAt: TEST_TIME,
    source: 'approval',
    operatorUserId: client.admin.user.id,
    code: null,
    orgId: null,
    invitationId: null,
    invitedByUserId: null,
  })
  expect(client.requests).toHaveLength(1)
  const mail = client.requests[0]
  expect(mail.headers.get('Authorization')).toBe('Bearer test-resend-secret')
  expect(await mail.json()).toEqual({
    from: 'Conductive <invites@mail.conductive.build>',
    to: ['member@example.com'],
    subject: 'Your Conductive account is ready',
    text: 'You can now use Conductive. Sign in with GitHub to get started:\nhttps://app.conductive.build/',
  })
  const user = await client.request(operatorUserPath(11))
  expect(await user.json()).toMatchObject({
    appAccess: {
      state: 'granted',
      grantedAt: TEST_TIME,
      source: { kind: 'approval', operator: { githubId: 10, login: 'admin' } },
    },
    referralCode: { kind: 'referral', useLimit: 5, uses: 0, recipients: [] },
  })
  client.setTime(TEST_TIME + 1)
  const repeat = await client.request(path, undefined, operatorWrite())
  expect(await repeat.json()).toEqual({ ...result, changed: false })
  const existing = await client.request(
    operatorApprovalPath(10),
    undefined,
    operatorWrite(),
  )
  expect(await existing.json()).toEqual({
    githubId: 10,
    changed: false,
    approvalEmail: { state: 'none', updatedAt: null },
    emailFailed: false,
  })
  expect(client.requests).toHaveLength(1)
})

it('grants access without saving or sending an email when no verified address exists', async () => {
  const client = await operatorWaitlistFixture(harness)
  const response = await client.request(
    operatorApprovalPath(12),
    undefined,
    operatorWrite(),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    githubId: 12,
    changed: true,
    approvalEmail: { state: 'none', updatedAt: TEST_TIME },
    emailFailed: false,
  })
  expect(await accessRecord(harness, client.other.user.id)).toMatchObject({
    source: 'approval',
  })
  expect(client.requests).toHaveLength(0)
  expect(
    await harness.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM approval_emails WHERE state = 'pending' OR recipient IS NOT NULL",
    ).first('count'),
  ).toBe(0)
})

it('refuses suspended and unknown people without a grant, referral code or email', async () => {
  const client = await operatorWaitlistFixture(harness)
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, client.member.user.id)
    .run()
  for (const [id, status, code] of [
    [11, 409, 'user_suspended'],
    [999, 404, 'user_not_found'],
    [Number.NaN, 404, 'user_not_found'],
  ] as const) {
    const response = await client.request(
      operatorApprovalPath(id),
      undefined,
      operatorWrite(),
    )
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code } })
  }
  expect(await accessRecord(harness, client.member.user.id)).toBeNull()
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM approval_emails',
    ).first('count'),
  ).toBe(0)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM access_codes WHERE owner_user_id = ?',
    )
      .bind(client.member.user.id)
      .first('count'),
  ).toBe(0)
  expect(client.requests).toHaveLength(0)
})

it('grants and sends only once when two approval requests arrive together', async () => {
  const client = await operatorWaitlistFixture(harness)
  const responses = await Promise.all([
    client.request(operatorApprovalPath(11), undefined, operatorWrite()),
    client.request(operatorApprovalPath(11), undefined, operatorWrite()),
  ])
  expect(responses.map((response) => response.status)).toEqual([200, 200])
  const results = await Promise.all(
    responses.map(async (response) => {
      const result: OperatorApprovalResponse = await response.json()
      return result
    }),
  )
  expect(results.map((result) => result.changed).sort()).toEqual([false, true])
  expect(client.requests).toHaveLength(1)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM approval_emails',
    ).first('count'),
  ).toBe(1)
  expect(
    await harness.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM access_codes WHERE kind = 'referral' AND owner_user_id = ?",
    )
      .bind(client.member.user.id)
      .first('count'),
  ).toBe(1)
})
