/**
 * The page of one user, as the operator opens it, in each state of the
 * page: in use, suspended, waiting, approved, and after each way in.
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
export type UserOrg = {
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
  joined: '1 Nov 2026',
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
} as const satisfies Record<string, UserPage>

/**
 * The pages of users who came in after the waitlist started: by an invite
 * code, by the referral code of another user, by an org invitation, and
 * as an operator.
 */
export const accessPages = {
  inviteCode: {
    login: 'rho-9',
    name: 'Rhea Okafor',
    initials: 'RO',
    githubId: 60318842,
    joined: '8 Nov 2026',
    owned: 2,
    running: 1,
    orgs: [{ name: 'Rhino Data', initials: 'RD', role: 'Admin' }],
    access: {
      state: 'granted',
      since: '8 Nov 2026 at 11:20',
      way: { kind: 'invite-code', label: 'Launch week' },
    },
    referral: referral('J3PQA-6NWRT'),
  },
  referralCode: {
    login: 'tide-sam',
    name: 'Sam Ortiz',
    initials: 'SO',
    githubId: 73650219,
    joined: '7 Nov 2026',
    owned: 3,
    running: 0,
    orgs: [{ name: 'Tidepool', initials: 'TP', role: 'Admin' }],
    access: {
      state: 'granted',
      since: '7 Nov 2026 at 09:05',
      way: { kind: 'referral-code', owner: 'dana-k' },
    },
    referral: referral('F8MWK-2XRHD', [
      { login: 'ivy-r', name: 'Ivy Rossi', initials: 'IR', day: '8 Nov' },
    ]),
  },
  orgInvitation: {
    login: 'kt-null',
    name: 'Kai Tanaka',
    initials: 'KT',
    githubId: 81122907,
    joined: '6 Nov 2026',
    owned: 2,
    running: 1,
    orgs: [{ name: 'Hexwave', initials: 'HW', role: 'Member' }],
    access: {
      state: 'granted',
      since: '6 Nov 2026 at 16:22',
      way: { kind: 'org-invitation', org: 'Hexwave' },
    },
    referral: referral('P7DYC-3KMVA'),
  },
  operator: {
    login: 'ellie-w',
    name: 'Ellie Wong',
    initials: 'EW',
    githubId: 90476315,
    joined: '4 Nov 2026',
    owned: 1,
    running: 0,
    orgs: [{ name: 'Futex', initials: 'FX', role: 'Member' }],
    access: {
      state: 'granted',
      since: '4 Nov 2026 at 08:47',
      way: { kind: 'operator' },
    },
    referral: referral('Y5GQN-8TWCE'),
  },
} as const satisfies Record<string, UserPage>
