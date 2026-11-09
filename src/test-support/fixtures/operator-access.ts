import type { OperatorSuspension } from '../../shared/operator'
import type {
  OperatorAccessCode,
  OperatorAccessSource,
  OperatorApprovalEmail,
  OperatorSignupPause,
  OperatorUserAccess,
  OperatorWaitlistEntry,
} from '../../shared/operator-waitlist'
import {
  noVerifiedEmail,
  sampleGitHubAges,
  sampleInviteCodes,
  sampleReferralCodes,
  sampleWays,
  type SampleIdentity,
  type SampleWayIn,
} from './operator-access-samples'
import {
  daysBefore,
  sampleOrgs,
  sampleUsers,
  type SampleUser,
} from './operator-samples'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** The approval of a person who waited: when, by whom, and its email. */
interface SampleApproval {
  approvedAt: number
  operator: SampleIdentity | null
  email: OperatorApprovalEmail
}

/** A code as the records keep it. Its state comes from its uses and its disable. */
export type CodeRecord = Omit<OperatorAccessCode, 'state'>

/** The records of the waitlist that an operator changes. */
export interface AccessRecords {
  /** The approvals of people who waited, by GitHub ID. */
  approvals: Map<number, SampleApproval>
  /** Each code by its text: the invite codes and the referral codes. */
  codes: Map<string, CodeRecord>
  pause: OperatorSignupPause
}

function identityOf(login: string): SampleIdentity {
  const user = sampleUsers.find((item) => item.login === login)
  if (!user) throw new Error(`The operator samples have no user ${login}.`)
  return { githubId: user.githubId, login }
}

function wayOf(user: SampleUser): SampleWayIn {
  return sampleWays[user.login] ?? { kind: 'existing' }
}

/** When a sample user got app access, or `null` while they wait. */
function grantTime(
  user: SampleUser,
  records: AccessRecords,
  now: number,
): number | null {
  const joinedAt = daysBefore(now, user.joinedDaysAgo)
  const approval = records.approvals.get(user.githubId)
  if (approval) return approval.approvedAt
  switch (wayOf(user).kind) {
    case 'waiting':
      return null
    case 'existing':
    case 'operator':
      return joinedAt
    default:
      return joinedAt + 5 * MINUTE
  }
}

/** The state of a code: disabled, used up, or still letting people in. */
export function codeReply(code: CodeRecord): OperatorAccessCode {
  const state =
    code.disabledAt !== null
      ? 'disabled'
      : code.uses >= code.useLimit
        ? 'used_up'
        : 'active'
  return { ...code, state }
}

/** The reply of the disable of a code: the code, disabled at `at` by `by`. */
export function disabledCode(
  code: OperatorAccessCode,
  at: number,
  by: SampleIdentity,
): OperatorAccessCode {
  return codeReply({
    code: code.code,
    kind: code.kind,
    label: code.label,
    owner: code.owner,
    createdBy: code.createdBy,
    createdAt: code.createdAt,
    useLimit: code.useLimit,
    uses: code.uses,
    disabledAt: at,
    disabledBy: by,
  })
}

/**
 * The records of the samples at `now`: the approvals of Ana Pereira, whose
 * email went, and of Joe Quinn, whose email never went; the invite codes
 * of the mockups; a referral code for each user with app access, which the
 * suspension of its owner disabled; and sign-ups open.
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
    codes: new Map(),
    pause: { paused: false, updatedAt: null, operator: null },
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

/** The users who came in with a referral code, with the time of each use. */
function recipientsOf(code: string, records: AccessRecords, now: number) {
  return sampleUsers.flatMap((user) => {
    const way = wayOf(user)
    const usedAt = grantTime(user, records, now)
    if (way.kind !== 'referral_code' || way.code !== code || usedAt === null) {
      return []
    }
    return [{ githubId: user.githubId, login: user.login, usedAt }]
  })
}

function sourceOf(
  way: SampleWayIn,
  records: AccessRecords,
): OperatorAccessSource {
  switch (way.kind) {
    case 'invite_code':
      return {
        kind: 'invite_code',
        code: way.code,
        label: records.codes.get(way.code)?.label ?? null,
      }
    case 'referral_code':
      return {
        kind: 'referral_code',
        code: way.code,
        owner: records.codes.get(way.code)?.owner ?? null,
      }
    case 'org_invitation': {
      const org = sampleOrgs.find((item) => item.id === way.orgId)
      return {
        kind: 'org_invitation',
        org: { id: way.orgId, name: org?.name ?? null },
        invitedBy: identityOf(way.by),
      }
    }
    case 'operator':
      return { kind: 'operator' }
    default:
      return { kind: 'existing' }
  }
}

/** The GitHub facts of a sample user: the creation of the account, and the email. */
function gitHubOf(user: SampleUser, now: number) {
  const age = sampleGitHubAges[user.login] ?? 2400
  return {
    githubCreatedAt: now - age * DAY - 3 * 60 * MINUTE,
    hasVerifiedEmail: !noVerifiedEmail.has(user.login),
  }
}

/** The app access of a sample user, their approval email, and their referral code. */
export function sampleUserAccess(
  user: SampleUser,
  records: AccessRecords,
  now: number,
): OperatorUserAccess {
  const approval = records.approvals.get(user.githubId)
  const grantedAt = grantTime(user, records, now)
  const referral = [...records.codes.values()].find(
    (code) =>
      code.kind === 'referral' && code.owner?.githubId === user.githubId,
  )
  return {
    appAccess:
      grantedAt === null
        ? {
            state: 'waiting',
            waitingSince: daysBefore(now, user.joinedDaysAgo),
          }
        : {
            state: 'granted',
            grantedAt,
            source: approval
              ? { kind: 'approval', operator: approval.operator }
              : sourceOf(wayOf(user), records),
          },
    approvalEmail: approval?.email ?? { state: 'none', updatedAt: null },
    ...gitHubOf(user, now),
    referralCode: referral
      ? {
          ...codeReply(referral),
          recipients: recipientsOf(referral.code, records, now),
        }
      : null,
  }
}

/** The people who wait and are not suspended, oldest first, as the Worker lists them. */
export function sampleWaitlist(
  records: AccessRecords,
  suspended: ReadonlyMap<number, unknown>,
  now: number,
): OperatorWaitlistEntry[] {
  return sampleUsers
    .filter(
      (user) =>
        grantTime(user, records, now) === null && !suspended.has(user.githubId),
    )
    .map((user) => ({
      githubId: user.githubId,
      login: user.login,
      name: user.name,
      joinedAt: daysBefore(now, user.joinedDaysAgo),
      ...gitHubOf(user, now),
    }))
    .sort((a, b) => a.joinedAt - b.joinedAt || a.githubId - b.githubId)
}

/** The codes of the records, newest first, with the text of the code as the tie. */
export function sampleCodes(records: AccessRecords): OperatorAccessCode[] {
  return [...records.codes.values()]
    .sort((a, b) => b.createdAt - a.createdAt || a.code.localeCompare(b.code))
    .map(codeReply)
}
