import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from './data'
import { grantAppAccess } from './grant'
import {
  accessRecord,
  sessionState,
  setPaused,
  waitlistFixture,
} from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('reads the waiting session and its approval address while the app gate refuses other routes', async () => {
  const { member } = await waitlistFixture(harness)
  await harness.env.DB.prepare(
    'UPDATE users SET primary_verified_email = ? WHERE id = ?',
  )
    .bind('member@example.com', member.user.id)
    .run()
  await setPaused(harness)
  const response = await harness.request(WAITLIST_PATHS.state, member.session)
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toEqual({
    appAccess: false,
    signupsPaused: true,
    waitlistOn: true,
    approvalEmail: 'member@example.com',
    referralCode: null,
  })
  expect(await sessionState(harness, member.session)).toEqual({
    user: member.user,
    appAccess: false,
  })
  const refused = await harness.request(API_PATHS.orgs, member.session)
  expect(refused.status).toBe(403)
  expect(await refused.json()).toMatchObject({
    error: { code: 'access_required' },
  })
})

it('grants access and one referral code once and keeps the original source on repeats', async () => {
  const { member, admin } = await waitlistFixture(harness)
  expect(
    await grantAppAccess(
      harness.env.DB,
      member.user.id,
      { source: 'existing' },
      TEST_TIME,
    ),
  ).toBe(true)
  const before = await readWaitlistState(harness.env.DB, member.user.id)
  expect(before).toEqual({
    appAccess: true,
    signupsPaused: false,
    waitlistOn: true,
    approvalEmail: null,
    referralCode: {
      code: expect.stringMatching(
        /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/,
      ),
      useLimit: 5,
      uses: 0,
      disabled: false,
    },
  })
  await harness.env.DB.prepare(
    'UPDATE access_codes SET disabled_at = ? WHERE owner_user_id = ?',
  )
    .bind(TEST_TIME, member.user.id)
    .run()
  expect(
    await grantAppAccess(
      harness.env.DB,
      member.user.id,
      { source: 'approval', operatorUserId: admin.user.id },
      TEST_TIME + 1,
    ),
  ).toBe(false)
  expect(await accessRecord(harness, member.user.id)).toEqual({
    grantedAt: TEST_TIME,
    source: 'existing',
    code: null,
    operatorUserId: null,
    orgId: null,
    invitationId: null,
    invitedByUserId: null,
  })
  const response = await harness.request(WAITLIST_PATHS.state, member.session)
  expect(await response.json()).toEqual({
    ...before,
    referralCode: { ...before.referralCode, disabled: true },
  })
  expect(
    await harness.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM access_codes WHERE kind = 'referral' AND owner_user_id = ?",
    )
      .bind(member.user.id)
      .first('count'),
  ).toBe(1)
})
