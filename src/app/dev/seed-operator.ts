import type { User } from '../../shared/api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  sampleOperator,
  sampleRecords,
  type OperatorRecords,
} from '../../test-support/fixtures/operator'
import {
  SAMPLE_IDS,
  sampleUsers,
} from '../../test-support/fixtures/operator-samples'
import { addReferralCode, referralCodeOf } from './access-codes'
import type { DevOptions } from './options'

const MINUTE = 60_000

/**
 * The waitlist of `waitlist=off`: the operator of the samples turned it off
 * 90 minutes ago. Zed K, who waited, came back half an hour later, so open
 * sign-up gave them app access with a new referral code, as the gate of the
 * Worker does. The other people still wait until their next visit.
 */
function turnOffWaitlist(records: OperatorRecords): void {
  records.waitlistSwitch = {
    waitlistOn: false,
    updatedAt: FAKE_TIME - 90 * MINUTE,
    operator: sampleOperator,
  }
  const zed = sampleUsers.find(
    (item) => item.githubId === SAMPLE_IDS.newestWaiting,
  )
  if (!zed) throw new Error('The operator samples have no Zed K.')
  const grantedAt = FAKE_TIME - 60 * MINUTE
  records.openSignups.set(zed.githubId, {
    grantedAt,
    operator: sampleOperator,
  })
  addReferralCode(
    records,
    { githubId: zed.githubId, login: zed.login },
    grantedAt,
  )
}

/** A deleted org stays for 7 days. */
export const DELETE_AFTER = 604_800_000

/**
 * The records of the operator samples. Acme of the options is deleted or
 * suspended there too, so the operator sees it as its members do. The
 * pause and the switch of the options, and the state of the referral code
 * of `user`, are those that the waitlist routes read too.
 */
export function operatorRecords(
  options: DevOptions,
  user: User,
): OperatorRecords {
  const records = sampleRecords(FAKE_TIME)
  if (options.deleted) {
    records.orgDeletions.set(FAKE_IDS.org, {
      deletedAt: FAKE_TIME,
      purgeAt: FAKE_TIME + DELETE_AFTER,
    })
  }
  if (options.suspended) {
    records.orgSuspensions.set(FAKE_IDS.org, {
      suspendedAt: FAKE_TIME,
      operator: sampleOperator,
    })
  }
  if (options.paused) {
    records.pause = {
      paused: true,
      updatedAt: FAKE_TIME,
      operator: sampleOperator,
    }
  }
  if (options.waitlistOff) turnOffWaitlist(records)
  const own = referralCodeOf(records, user.githubId)
  if (own && options.inviteCode === 'used-up') own.uses = own.useLimit
  if (own && options.inviteCode === 'disabled') {
    own.disabledAt = FAKE_TIME
    own.disabledBy = sampleOperator
  }
  return records
}
