/**
 * The app access of a user and their referral code, as the page of a user
 * shows them to the operator.
 */
import { account } from './orgs'

/**
 * Whether the approval email went, and when. The app sends a failed email
 * again for 24 hours. An email that never went says why: the GitHub
 * account has no verified email, or the app stopped trying.
 */
export type ApprovalEmailNote =
  | { state: 'pending' }
  | { state: 'sent'; at: string }
  | { state: 'not-sent'; reason: 'no-verified-email' }
  | { state: 'not-sent'; reason: 'stopped'; on: string }

/** How a user got app access: the way in, and who or what let them in. */
export type WayIn =
  | { kind: 'approval'; by: string; email: ApprovalEmailNote }
  | { kind: 'invite-code'; label: string }
  | { kind: 'referral-code'; owner: string }
  | { kind: 'org-invitation'; org: string }
  | { kind: 'operator' }
  | { kind: 'existing' }

/** A user who waits since a day, or who has app access since a time. */
export type AppAccess =
  | { state: 'waiting'; since: string }
  | { state: 'granted'; since: string; way: WayIn }

/** A person who came in with a referral code, and the day they came in. */
export type ReferralUse = {
  login: string
  name?: string
  initials: string
  day: string
}

/**
 * The referral code of a user with app access: the code, its 5 uses, the
 * people who used them, and the disable of an operator.
 */
export type ReferralCode = {
  code: string
  limit: number
  usedBy: readonly ReferralUse[]
  disabled?: { on: string; by: string }
}

/** Each user with app access has one referral code with 5 uses. */
export const referralLimit = 5

/** A referral code with its uses, which the grant of app access made. */
export function referral(
  code: string,
  usedBy: readonly ReferralUse[] = [],
): ReferralCode {
  return { code, limit: referralLimit, usedBy }
}

const danaCode = 'R4WNE-8KT3M'

/** The uses of the code of Dana Kim before 6 Nov. */
const danaEarlyUses: readonly ReferralUse[] = [
  { login: 'kofi-a', name: 'Kofi Asante', initials: 'KA', day: '5 Nov' },
  { login: 'yuki-t', name: 'Yuki Tan', initials: 'YT', day: '3 Nov' },
]

/** The referral code of Dana Kim, with 3 of its 5 uses taken. */
export const danaReferral = referral(danaCode, [
  { login: 'tide-sam', name: 'Sam Ortiz', initials: 'SO', day: '7 Nov' },
  ...danaEarlyUses,
])

/** The code of Dana Kim at her suspension on 6 Nov, before its third use. */
export const danaReferralAtSuspension = referral(danaCode, danaEarlyUses)

/** A referral code after the operator disabled it. */
export function disabledReferral(code: ReferralCode, on: string): ReferralCode {
  return { ...code, disabled: { on, by: account.login } }
}

/**
 * The referral code of the operator who reads the pages, Cal, with 2 of
 * its 5 uses taken, as his Account page shows it.
 */
export const operatorReferral = referral('K7QHM-3XP2R', [
  { login: 'noa-b', name: 'Noa Ben-Ami', initials: 'NB', day: '4 Nov' },
  { login: 'femi-o', name: 'Femi Ola', initials: 'FO', day: '2 Nov' },
])

/** The time of the approval that the screens show. */
export const approvedAt = '8 Nov 2026 at 15:04'

/** An approval of the operator, with the state of its email. */
export function approval(
  email: ApprovalEmailNote,
  since: string = approvedAt,
): AppAccess {
  return {
    state: 'granted',
    since,
    way: { kind: 'approval', by: account.login, email },
  }
}
