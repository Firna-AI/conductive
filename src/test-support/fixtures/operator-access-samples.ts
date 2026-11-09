import { fakeUsers } from './core'

/** A GitHub account as the operator replies name it. */
export interface SampleIdentity {
  githubId: number
  login: string
}

/**
 * How a sample user got app access, or that they wait. An approval of the
 * samples came from the operator, a day after the join, and its email
 * went or the app stopped trying.
 */
export type SampleWayIn =
  | { kind: 'waiting' }
  | { kind: 'existing' }
  | { kind: 'operator' }
  | { kind: 'approval'; email: 'sent' | 'failed' }
  | { kind: 'invite_code'; code: string }
  | { kind: 'referral_code'; code: string }
  | { kind: 'org_invitation'; orgId: string; by: string }

/**
 * A code of the samples. An operator makes an invite code with a label and
 * a use limit. A referral code belongs to a user, and counts its uses from
 * the users who came in with it.
 */
export interface SampleCode {
  code: string
  kind: 'invite' | 'referral'
  label: string | null
  owner: string | null
  createdBy: SampleIdentity | null
  /** The days before the time of the samples when the code was made. */
  madeDaysAgo: number
  useLimit: number
  /** The uses of an invite code. */
  uses: number
  disabled: boolean
}

const [cal] = fakeUsers

/** The operator who made most codes: the person signed in. */
const operator: SampleIdentity = {
  githubId: cal.githubId,
  login: cal.githubLogin,
}

/** The other operator of the mockups, who made one invite code. */
const ellie: SampleIdentity = { githubId: 90476315, login: 'ellie-w' }

/** The way in of each user who did not join before the waitlist. */
export const sampleWays: Readonly<Record<string, SampleWayIn>> = {
  'rho-9': { kind: 'invite_code', code: 'V7MKC-2QDXH' },
  'tide-sam': { kind: 'referral_code', code: 'M4QTX-7HKWD' },
  'ana-p': { kind: 'approval', email: 'sent' },
  'joe-q': { kind: 'approval', email: 'failed' },
  'kt-null': { kind: 'org_invitation', orgId: 'org_h3xw4v8q', by: 'vex-ops' },
  'vex-ops': { kind: 'operator' },
  'zed-k': { kind: 'waiting' },
  'bram-v': { kind: 'waiting' },
  'samir-h': { kind: 'waiting' },
  'lena-h': { kind: 'waiting' },
  'ovi-dev': { kind: 'waiting' },
  'nadia-q': { kind: 'waiting' },
  'kenji-w': { kind: 'waiting' },
  pkwan: { kind: 'waiting' },
  'jules-m': { kind: 'waiting' },
  'sam-okafor': { kind: 'waiting' },
}

/**
 * The age of the GitHub account of each user, in days, from the mockups
 * where they name it. Every account has a verified email, except the one
 * of Kenji Watanabe.
 */
export const sampleGitHubAges: Readonly<Record<string, number>> = {
  'rho-9': 1100,
  'zed-k': 2,
  'tide-sam': 1830,
  'bram-v': 155,
  'ana-p': 2600,
  'joe-q': 900,
  'samir-h': 400,
  'lena-h': 4020,
  'ovi-dev': 731,
  'nadia-q': 2560,
  'kt-null': 2925,
  'kenji-w': 1462,
  'vex-ops': 75,
  pkwan: 21,
  'jules-m': 1462,
  'sam-okafor': 3290,
  'dana-k': 2200,
}

/** The users whose GitHub account has no verified email. */
export const noVerifiedEmail: ReadonlySet<string> = new Set(['kenji-w'])

/** The referral code of each user with app access in the samples. */
export const sampleReferralCodes: Readonly<Record<string, string>> = {
  'rho-9': 'J3PQA-6NWRT',
  'tide-sam': 'F8MWK-2XRHD',
  'ana-p': 'A9RXC-3WMPT',
  'joe-q': 'D7HQK-4XNWP',
  'kt-null': 'P7DYC-3KMVA',
  'vex-ops': 'Y5GQN-8TWCE',
  'dana-k': 'R4WNE-8KT3M',
  'mira-s': 'M4QTX-7HKWD',
  'li-wei': 'W2HQE-8NXKC',
  'tomas-r': 'T5MZR-4QWHA',
  'danny-b': 'B8KVN-2DXQE',
  [fakeUsers[1].githubLogin]: 'P3YRW-6TKMA',
  [fakeUsers[2].githubLogin]: 'J6WDX-9QMHC',
  [cal.githubLogin]: 'K7QHM-3XP2R',
}

function invite(
  label: string,
  code: string,
  [uses, useLimit]: readonly [number, number],
  madeDaysAgo: number,
  createdBy = operator,
): SampleCode {
  return {
    code,
    kind: 'invite',
    label,
    owner: null,
    createdBy,
    madeDaysAgo,
    useLimit,
    uses,
    disabled: false,
  }
}

/**
 * The invite codes of the mockups, newest first: one that let Rhea Okafor
 * in, one by another operator, one used up, and one disabled.
 */
export const sampleInviteCodes: readonly SampleCode[] = [
  invite('Launch week', 'V7MKC-2QDXH', [12, 50], 9),
  invite('Meetup Lisbon', 'TQ8WN-2HKXP', [7, 30], 10, ellie),
  invite('Design partners', '9PTXC-4WHMN', [5, 5], 11),
  { ...invite('Hacker News', 'HM3PE-7KWQT', [18, 100], 12), disabled: true },
  invite('Friends', '6FJDA-9RCVY', [3, 10], 13),
  invite('Beta testers', 'X2NRT-5GJHD', [24, 25], 14),
]
