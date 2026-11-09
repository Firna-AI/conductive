import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { acceptOrgInvite } from '../members/invites'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { redeemInviteCode } from './use-code'
import {
  accessRecord,
  addInviteCode,
  uses,
  waitingInvitation,
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

it.each(['code', 'invitation'] as const)(
  'rolls back the %s and its access grant when the referral code cannot be saved',
  async (way) => {
    const { member, org, invitation } = await waitingInvitation(harness)
    const db = harness.env.DB
    const code = await addInviteCode(harness)
    await db
      .prepare(
        `CREATE TRIGGER refuse_test_referral BEFORE INSERT ON access_codes
       WHEN NEW.kind = 'referral' BEGIN SELECT RAISE(ABORT, 'referral save failed'); END`,
      )
      .run()
    try {
      await expect(
        way === 'code'
          ? redeemInviteCode(db, member.user.id, code, TEST_TIME)
          : acceptOrgInvite(
              db,
              member.user.id,
              org.id,
              invitation.id,
              TEST_TIME,
            ),
      ).rejects.toThrow('referral save failed')
      expect(await accessRecord(harness, member.user.id)).toBeNull()
      expect(await uses(harness)).toBe(0)
      expect(
        await db
          .prepare(
            'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?',
          )
          .bind(org.id, member.user.id)
          .first(),
      ).toBeNull()
      expect(
        await db
          .prepare('SELECT id FROM org_invites WHERE id = ?')
          .bind(invitation.id)
          .first('id'),
      ).toBe(invitation.id)
    } finally {
      await db.prepare('DROP TRIGGER refuse_test_referral').run()
    }
  },
)
