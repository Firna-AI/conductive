/**
 * The page of a user for each way in after the waitlist started, as the
 * operator opens it.
 */
import { approval, referral } from './operatorAccess'
import { waitlistSwitch } from './operatorCodes'
import { kenji, type UserPage } from './operatorUserPages'

/** Open sign-up names the operator who turned off the waitlist. */
const openSignUp = { kind: 'open-sign-up', by: waitlistSwitch.by } as const

/**
 * The pages of users who came in after the waitlist started: by an invite
 * code, by the referral code of another user, by an org invitation, as an
 * operator, and by an approval whose email never went. Then two users of
 * open sign-up: a new sign-in, and a person who waited and came back.
 */
export const accessPages = {
  inviteCode: {
    login: 'rho-9',
    name: 'Rhea Okafor',
    initials: 'RO',
    githubId: 60318842,
    githubAge: '3 years',
    verifiedEmail: true,
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
    githubAge: '5 years',
    verifiedEmail: true,
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
    githubAge: '8 years',
    verifiedEmail: true,
    joined: '6 Nov 2026',
    owned: 2,
    running: 1,
    orgs: [{ name: 'Hexwave', initials: 'HW', role: 'Member' }],
    access: {
      state: 'granted',
      since: '6 Nov 2026 at 16:22',
      way: { kind: 'org-invitation', org: 'Hexwave', by: 'vex-ops' },
    },
    referral: referral('P7DYC-3KMVA'),
  },
  operator: {
    login: 'ellie-w',
    name: 'Ellie Wong',
    initials: 'EW',
    githubId: 90476315,
    githubAge: '10 years',
    verifiedEmail: true,
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
  emailNotSent: {
    ...kenji,
    access: approval(
      { state: 'not-sent', reason: 'no-verified-email' },
      '7 Nov 2026 at 10:02',
    ),
    referral: referral('D7HQK-4XNWP'),
  },
  openSignUp: {
    login: 'mira-l',
    name: 'Mira Lund',
    initials: 'ML',
    githubId: 77310452,
    githubAge: '6 years',
    verifiedEmail: true,
    joined: '8 Nov 2026',
    owned: 1,
    running: 1,
    orgs: [{ name: 'Lund Labs', initials: 'LL', role: 'Admin' }],
    access: {
      state: 'granted',
      since: '8 Nov 2026 at 12:14',
      way: openSignUp,
    },
    referral: referral('C4VRT-9KMWE'),
  },
  openSignUpWaited: {
    login: 'noor-a',
    name: 'Noor Aziz',
    initials: 'NA',
    githubId: 68841207,
    githubAge: '9 years',
    verifiedEmail: true,
    joined: '5 Nov 2026',
    owned: 0,
    running: 0,
    orgs: [],
    access: {
      state: 'granted',
      since: '8 Nov 2026 at 12:40',
      way: openSignUp,
    },
    referral: referral('G6PXH-3TNDA'),
  },
} as const satisfies Record<string, UserPage>
