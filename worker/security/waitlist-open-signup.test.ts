import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { createApp } from '../application'
import { interceptMembersWrite } from '../members/guarded-write.test-support'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from '../waitlist/data'
import { grantAppAccess } from '../waitlist/grant'
import {
  accessRecord,
  setPaused,
  setWaitlist,
  waitlistFixture,
} from '../waitlist/waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

function protectedRequest(session: string, db: D1Database, now: number) {
  return createApp({ now: () => now }).fetch(
    new Request(`${TEST_ORIGIN}${API_PATHS.orgs}`, {
      headers: { Cookie: session, Origin: TEST_ORIGIN },
    }),
    { ...harness.env, DB: db },
  )
}

it('admits a waiting request when another grant wins and keeps that grant and referral code', async () => {
  const { admin, member } = await waitlistFixture(harness)
  await setWaitlist(harness, false, admin.user.id)
  let referralCode: string | undefined
  const race = interceptMembersWrite(harness.env.DB, async () => {
    await grantAppAccess(
      harness.env.DB,
      member.user.id,
      { source: 'approval', operatorUserId: admin.user.id },
      TEST_TIME + 1,
    )
    referralCode = (await readWaitlistState(harness.env.DB, member.user.id))
      .referralCode?.code
    await harness.env.DB.prepare(
      'UPDATE access_codes SET disabled_at = ? WHERE owner_user_id = ?',
    )
      .bind(TEST_TIME + 1, member.user.id)
      .run()
    await setWaitlist(harness, true, admin.user.id)
  })
  const response = await protectedRequest(
    member.session,
    race.db,
    TEST_TIME + 2,
  )
  expect(response.status).toBe(200)
  expect(race.calls()).toBe(1)
  expect(await accessRecord(harness, member.user.id)).toMatchObject({
    source: 'approval',
    grantedAt: TEST_TIME + 1,
    operatorUserId: admin.user.id,
  })
  expect(
    (await readWaitlistState(harness.env.DB, member.user.id)).referralCode,
  ).toEqual({
    code: referralCode,
    useLimit: 5,
    uses: 0,
    disabled: true,
  })
  expect(
    await harness.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM access_codes WHERE owner_user_id = ? AND kind = 'referral'",
    )
      .bind(member.user.id)
      .first('count'),
  ).toBe(1)
})

it('refuses open-sign-up access when a pause wins before the grant batch', async () => {
  const { admin, member } = await waitlistFixture(harness)
  await setWaitlist(harness, false, admin.user.id)
  const race = interceptMembersWrite(harness.env.DB, () => setPaused(harness))
  const response = await protectedRequest(member.session, race.db, TEST_TIME)
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'access_required' },
  })
  expect(race.calls()).toBe(1)
  expect(await accessRecord(harness, member.user.id)).toBeNull()
  expect(
    (await readWaitlistState(harness.env.DB, member.user.id)).referralCode,
  ).toBeNull()
})

it('records the live operator when the waitlist changes before the grant batch', async () => {
  const { admin, member, other } = await waitlistFixture(harness)
  await setWaitlist(harness, false, admin.user.id)
  const race = interceptMembersWrite(harness.env.DB, () =>
    setWaitlist(harness, false, other.user.id),
  )
  const response = await protectedRequest(member.session, race.db, TEST_TIME)
  expect(response.status).toBe(200)
  expect(race.calls()).toBe(1)
  expect(await accessRecord(harness, member.user.id)).toMatchObject({
    source: 'open_signup',
    grantedAt: TEST_TIME,
    operatorUserId: other.user.id,
  })
})
