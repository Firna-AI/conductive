/**
 * The people on the waitlist, as the operator sees them in the Waitlist
 * tab: oldest first, 20 at a time. The section shows no picture and no
 * email address of a person who waits.
 */

/** A person who waits: their GitHub account, and the day they joined. */
export type WaitingPerson = {
  login: string
  /** The name on GitHub, which some accounts do not give. */
  name?: string
  initials: string
  /** How long the GitHub account has existed, such as "9 years". */
  githubAge: string
  /**
   * Whether the GitHub account has a primary verified email, which gets the
   * approval email. The tab shows no address, and Approve uses this fact.
   */
  verifiedEmail: boolean
  /** The day of the first sign-in, when the person joined the waitlist. */
  joined: string
}

/** How many people wait now. */
export const waitlistTotal = 38

/** The first person on the waitlist, whom the screens approve. */
export const samOkafor: WaitingPerson = {
  login: 'sam-okafor',
  name: 'Sam Okafor',
  initials: 'SO',
  githubAge: '9 years',
  verifiedEmail: true,
  joined: '1 Nov',
}

/** The last person who joined the waitlist, with no name on GitHub. */
export const newestWaiting: WaitingPerson = {
  login: 'zed-k',
  initials: 'ZK',
  githubAge: '2 days',
  verifiedEmail: true,
  joined: '8 Nov',
}

/** The people who wait, oldest first, as the tab lists them with no search. */
export const waitlist: readonly WaitingPerson[] = [
  samOkafor,
  {
    login: 'jules-m',
    name: 'Jules Martin',
    initials: 'JM',
    githubAge: '4 years',
    verifiedEmail: true,
    joined: '2 Nov',
  },
  {
    login: 'pkwan',
    initials: 'PK',
    githubAge: '3 weeks',
    verifiedEmail: true,
    joined: '3 Nov',
  },
  {
    login: 'nadia-q',
    name: 'Nadia Qureshi',
    initials: 'NQ',
    githubAge: '7 years',
    verifiedEmail: true,
    joined: '4 Nov',
  },
  {
    login: 'ovi-dev',
    name: 'Ovidiu Pop',
    initials: 'OP',
    githubAge: '2 years',
    verifiedEmail: true,
    joined: '5 Nov',
  },
  {
    login: 'lena-h',
    name: 'Lena Hart',
    initials: 'LH',
    githubAge: '11 years',
    verifiedEmail: true,
    joined: '6 Nov',
  },
  {
    login: 'bram-v',
    name: 'Bram Visser',
    initials: 'BV',
    githubAge: '5 months',
    verifiedEmail: true,
    joined: '7 Nov',
  },
  newestWaiting,
]

/** A search of the Waitlist tab finds only people who wait. */
export const waitlistSearch = {
  query: 'sam',
  rows: [
    samOkafor,
    {
      login: 'samir-h',
      name: 'Samir Haddad',
      initials: 'SH',
      githubAge: '1 year',
      verifiedEmail: true,
      joined: '6 Nov',
    },
  ],
} as const satisfies { query: string; rows: readonly WaitingPerson[] }

/**
 * Whether the email of an approval went: sent, or not yet, while the app
 * sends it again on its own.
 */
export type ApprovalEmail = 'sent' | 'pending'

/**
 * The people whom the operator approved from the list in this visit, with
 * the state of each approval email. Their rows stay until the list loads
 * again.
 */
export const approvedNow: Readonly<Record<string, ApprovalEmail>> = {
  'sam-okafor': 'pending',
  'jules-m': 'sent',
}
