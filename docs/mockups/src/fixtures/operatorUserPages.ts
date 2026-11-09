/**
 * The page of one user, as the operator opens it, in each state of the
 * page: in use, suspended, waiting, and approved. The pages of each way in
 * are in `operatorAccessPages.ts`.
 */
import {
  approval,
  danaReferral,
  danaReferralAtSuspension,
  disabledReferral,
  operatorReferral,
  referral,
  type AppAccess,
  type ReferralCode,
} from './operatorAccess'
import type { SuspensionNote } from './operatorDirectory'
import { samOkafor } from './operatorWaitlist'
import { account } from './orgs'

/** An org of a user, with the role of the user in it. */
type UserOrg = {
  name: string
  initials: string
  role: 'Admin' | 'Member'
}

/** The page of a user: their details, app access, workspaces, and orgs. */
export type UserPage = {
  login: string
  name: string
  initials: string
  githubId: number
  /** How long the GitHub account has existed, as the Waitlist tab shows it. */
  githubAge: string
  /**
   * Whether the GitHub account has a primary verified email, which gets the
   * approval email. The section shows no address, only this fact.
   */
  verifiedEmail: boolean
  joined: string
  owned: number
  running: number
  orgs: readonly UserOrg[]
  suspension?: SuspensionNote
  access: AppAccess
  /** Each user with app access has a referral code. */
  referral?: ReferralCode
}

const dana = {
  login: 'dana-k',
  name: 'Dana Kim',
  initials: 'DK',
  githubId: 58201734,
  githubAge: '6 years',
  verifiedEmail: true,
  joined: '21 Oct 2026',
  owned: 14,
  orgs: [
    { name: 'Hexwave', initials: 'HW', role: 'Member' },
    { name: 'Dana’s Lab', initials: 'DL', role: 'Admin' },
  ],
  access: { state: 'granted', since: '21 Oct 2026', way: { kind: 'existing' } },
} as const satisfies Omit<UserPage, 'running'>

const sam = {
  login: samOkafor.login,
  name: 'Sam Okafor',
  initials: samOkafor.initials,
  githubId: 91827364,
  githubAge: samOkafor.githubAge,
  verifiedEmail: samOkafor.verifiedEmail,
  joined: '1 Nov 2026',
  owned: 0,
  running: 0,
  orgs: [],
} as const satisfies Omit<UserPage, 'access'>

/**
 * Kenji Watanabe, whose GitHub account has no verified email, so his
 * approval sends no email. His page after the approval is in
 * `operatorAccessPages.ts`.
 */
export const kenji = {
  login: 'kenji-w',
  name: 'Kenji Watanabe',
  initials: 'KW',
  githubId: 70214398,
  githubAge: '4 years',
  verifiedEmail: false,
  joined: '3 Nov 2026',
  owned: 0,
  running: 0,
  orgs: [],
} as const satisfies Omit<UserPage, 'access'>

/** The new referral code that the approval of Sam Okafor made. */
const samReferral = referral('W6KTR-9HPXE')

/**
 * The pages of a user: in use, after a disable of their referral code,
 * suspended, and the operator's own, each with app access from before the
 * waitlist. Then a person who waits, and the same person after Approve.
 * Then a person who waits with no verified email on GitHub.
 */
export const userPages = {
  active: { ...dana, running: 1, referral: danaReferral },
  codeDisabled: {
    ...dana,
    running: 1,
    referral: disabledReferral(danaReferral, '8 Nov 2026 at 15:20'),
  },
  suspended: {
    ...dana,
    running: 0,
    suspension: { since: '6 Nov at 09:12', by: account.login, stopping: 0 },
    referral: disabledReferral(danaReferralAtSuspension, '6 Nov 2026 at 09:12'),
  },
  self: {
    login: account.login,
    name: account.name,
    initials: account.initials,
    githubId: 4412907,
    githubAge: '12 years',
    verifiedEmail: true,
    joined: '2 Sep 2026',
    owned: 41,
    running: 2,
    orgs: [
      { name: 'Acme', initials: 'AC', role: 'Admin' },
      { name: 'Futex', initials: 'FX', role: 'Admin' },
      { name: 'Firna', initials: 'FI', role: 'Admin' },
    ],
    access: {
      state: 'granted',
      since: '2 Sep 2026',
      way: { kind: 'existing' },
    },
    referral: operatorReferral,
  },
  waiting: { ...sam, access: { state: 'waiting', since: '1 Nov 2026' } },
  approved: {
    ...sam,
    access: approval({ state: 'pending' }),
    referral: samReferral,
  },
  emailed: {
    ...sam,
    access: approval({ state: 'sent', at: '8 Nov 2026 at 15:21' }),
    referral: samReferral,
  },
  waitingNoEmail: {
    ...kenji,
    access: { state: 'waiting', since: '3 Nov 2026' },
  },
} as const satisfies Record<string, UserPage>
