import type { OperatorSuspension } from '../../shared/operator'
import {
  grantTime,
  recipientsOf,
  wayOf,
  type AccessRecords,
  type SampleApproval,
} from './operator-access'
import {
  sampleInviteCodes,
  sampleReferralCodes,
  type SampleIdentity,
} from './operator-access-samples'
import { daysBefore, sampleUsers } from './operator-samples'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/**
 * The records of the samples at `now`: the approvals of Ana Pereira, whose
 * email went, and of Joe Quinn, whose email never went; the invite codes
 * of the mockups; a referral code for each user with app access, which the
 * suspension of its owner disabled; and sign-ups open, with the waitlist on.
 */
export function sampleAccessRecords(
  now: number,
  operator: SampleIdentity,
  userSuspensions: ReadonlyMap<number, OperatorSuspension>,
): AccessRecords {
  const approvals = new Map<number, SampleApproval>()
  for (const user of sampleUsers) {
    const way = wayOf(user)
    if (way.kind !== 'approval') continue
    const approvedAt = daysBefore(now, user.joinedDaysAgo) + DAY
    const sent = way.email === 'sent'
    approvals.set(user.githubId, {
      approvedAt,
      operator,
      email: {
        state: way.email,
        updatedAt: approvedAt + (sent ? MINUTE : DAY),
      },
    })
  }
  const records: AccessRecords = {
    approvals,
    openSignups: new Map(),
    codes: new Map(),
    pause: { paused: false, updatedAt: null, operator: null },
    waitlistSwitch: { waitlistOn: true, updatedAt: null, operator: null },
  }
  for (const code of sampleInviteCodes) {
    records.codes.set(code.code, {
      code: code.code,
      kind: code.kind,
      label: code.label,
      owner: null,
      createdBy: code.createdBy,
      createdAt: now - code.madeDaysAgo * DAY - 3 * 60 * MINUTE,
      useLimit: code.useLimit,
      uses: code.uses,
      disabledAt: code.disabled ? now - 2 * DAY : null,
      disabledBy: code.disabled ? operator : null,
    })
  }
  for (const user of sampleUsers) {
    const code = sampleReferralCodes[user.login]
    const grantedAt = grantTime(user, records, now)
    if (code === undefined || grantedAt === null) continue
    const suspension = userSuspensions.get(user.githubId)
    records.codes.set(code, {
      code,
      kind: 'referral',
      label: null,
      owner: { githubId: user.githubId, login: user.login },
      createdBy: null,
      createdAt: grantedAt,
      useLimit: 5,
      uses: recipientsOf(code, records, now).length,
      disabledAt: suspension?.suspendedAt ?? null,
      disabledBy: suspension ? suspension.operator : null,
    })
  }
  return records
}
