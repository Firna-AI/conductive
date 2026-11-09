/**
 * The page of a user for each way in after the waitlist started, as the
 * operator opens it.
 */
import { approval, referral } from './operatorAccess'
import type { UserPage } from './operatorUserPages'

/**
 * The pages of users who came in after the waitlist started: by an invite
 * code, by the referral code of another user, by an org invitation, as an
 * operator, and by an approval whose email never went.
 */
export const accessPages = {
  inviteCode: {
    login: 'rho-9',
    name: 'Rhea Okafor',
    initials: 'RO',
    githubId: 60318842,
    githubAge: '3 years',
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
    githubAge: '10 years',
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
    login: 'kenji-w',
    name: 'Kenji Watanabe',
    initials: 'KW',
    githubId: 70214398,
    githubAge: '4 years',
    joined: '3 Nov 2026',
    owned: 0,
    running: 0,
    orgs: [],
    access: approval(
      { state: 'not-sent', reason: 'no-verified-email' },
      '7 Nov 2026 at 10:02',
    ),
    referral: referral('D7HQK-4XNWP'),
  },
} as const satisfies Record<string, UserPage>
