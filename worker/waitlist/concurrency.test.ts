import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { interceptMembersWrite } from '../members/guarded-write.test-support'
import { acceptOrgInvite } from '../members/invites'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from './data'
import { redeemInviteCode } from './use-code'
import {
  accessRecord,
  addInviteCode,
  setPaused,
  useCode,
  uses,
  waitingInvitation,
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

it('gives the last use to only one of two concurrent people', async () => {
  const { member, other } = await waitlistFixture(harness)
  const code = await addInviteCode(harness)
  const responses = await Promise.all([
    useCode(harness, member.session, code),
    useCode(harness, other.session, code),
  ])
  expect(responses.map((response) => response.status).sort()).toEqual([
    200, 409,
  ])
  const states = await Promise.all([
    readWaitlistState(harness.env.DB, member.user.id),
    readWaitlistState(harness.env.DB, other.user.id),
  ])
  expect(states.map((state) => state.appAccess).sort()).toEqual([false, true])
  expect(await uses(harness, code)).toBe(1)
  const bodies = await Promise.all(responses.map((response) => response.json()))
  expect(bodies).toContainEqual({
    error: {
      code: 'invite_code_used_up',
      message: 'This invite code has no uses left.',
    },
  })
})

it('takes no code use when the pause commits before the redemption batch', async () => {
  const { member } = await waitlistFixture(harness)
  const code = await addInviteCode(harness)
  const race = interceptMembersWrite(harness.env.DB, () => setPaused(harness))
  await expect(
    redeemInviteCode(race.db, member.user.id, code, TEST_TIME),
  ).rejects.toMatchObject({ status: 403, code: 'signups_paused' })
  expect(race.calls()).toBe(1)
  expect(await uses(harness)).toBe(0)
  expect(await accessRecord(harness, member.user.id)).toBeNull()
})

it.each(['same code', 'different codes'])(
  'takes one use for a double submit with %s',
  async (scenario) => {
    const { member } = await waitlistFixture(harness)
    const first = await addInviteCode(harness)
    const second =
      scenario === 'same code'
        ? first
        : await addInviteCode(harness, '23456789AB')
    const responses = await Promise.all([
      useCode(harness, member.session, first),
      useCode(harness, member.session, second),
    ])
    expect(responses.map((response) => response.status)).toEqual([200, 200])
    expect(await uses(harness)).toBe(1)
    expect(
      await harness.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM access_codes WHERE kind = 'referral' AND owner_user_id = ?",
      )
        .bind(member.user.id)
        .first('count'),
    ).toBe(1)
  },
)

it.each(['invitation', 'code'] as const)(
  'keeps one grant when the %s commits before the other batch',
  async (first) => {
    const { member, org, invitation, admin } = await waitingInvitation(harness)
    const code = await addInviteCode(harness)
    const accept = (db: D1Database) =>
      acceptOrgInvite(db, member.user.id, org.id, invitation.id, TEST_TIME)
    const use = (db: D1Database) =>
      redeemInviteCode(db, member.user.id, code, TEST_TIME)
    const race = interceptMembersWrite(harness.env.DB, () =>
      first === 'invitation' ? accept(harness.env.DB) : use(harness.env.DB),
    )
    await (first === 'invitation' ? use(race.db) : accept(race.db))
    expect(race.calls()).toBe(1)
    expect(await uses(harness)).toBe(first === 'invitation' ? 0 : 1)
    expect(await accessRecord(harness, member.user.id)).toMatchObject(
      first === 'invitation'
        ? {
            source: 'org_invitation',
            code: null,
            orgId: org.id,
            invitedByUserId: admin.user.id,
          }
        : { source: 'invite_code', code, orgId: null, invitedByUserId: null },
    )
    expect(
      await harness.env.DB.prepare(
        'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(org.id, member.user.id)
        .first('role'),
    ).toBe('member')
    expect(
      await harness.env.DB.prepare('SELECT id FROM org_invites WHERE id = ?')
        .bind(invitation.id)
        .first(),
    ).toBeNull()
  },
)
