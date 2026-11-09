/** The users that the operator finds in the Users tab. */
import type { TargetStatus } from './operatorDirectory'
import {
  newestWaiting,
  samOkafor,
  type WaitingPerson,
} from './operatorWaitlist'

/**
 * The state of a user: in use, suspended, or waiting for app access on the
 * waitlist.
 */
export type UserStatus = Exclude<TargetStatus, 'deleted'> | 'waiting'

/** A user in the list of the Users tab. */
export type UserRow = {
  login: string
  name?: string
  initials: string
  joined: string
  orgs: number
  workspaces: number
  status: UserStatus
}

const dana: UserRow = {
  login: 'dana-k',
  name: 'Dana Kim',
  initials: 'DK',
  joined: '21 Oct',
  orgs: 2,
  workspaces: 14,
  status: 'suspended',
}

/** A person who waits shows in the list as a user without app access. */
function waiting(person: WaitingPerson): UserRow {
  const { login, name, initials, joined } = person
  return {
    login,
    name,
    initials,
    joined,
    orgs: 0,
    workspaces: 0,
    status: 'waiting',
  }
}

/**
 * The newest users first, as the Users tab lists them with no search. The
 * people who wait are users too.
 */
export const newestUsers: readonly UserRow[] = [
  waiting(newestWaiting),
  {
    login: 'rho-9',
    name: 'Rhea Okafor',
    initials: 'RO',
    joined: '8 Nov',
    orgs: 1,
    workspaces: 2,
    status: 'active',
  },
  {
    login: 'tide-sam',
    name: 'Sam Ortiz',
    initials: 'SO',
    joined: '7 Nov',
    orgs: 1,
    workspaces: 3,
    status: 'active',
  },
  waiting(samOkafor),
  {
    login: 'vex-ops',
    initials: 'V',
    joined: '28 Oct',
    orgs: 1,
    workspaces: 6,
    status: 'active',
  },
  dana,
  {
    login: 'mira-s',
    name: 'Mira Santos',
    initials: 'MS',
    joined: '3 Oct',
    orgs: 2,
    workspaces: 23,
    status: 'active',
  },
  {
    login: 'li-wei',
    name: 'Li Wei',
    initials: 'LW',
    joined: '30 Sep',
    orgs: 1,
    workspaces: 31,
    status: 'active',
  },
]

/** The search of the Users tab, and what it finds. */
export const userSearches = {
  name: {
    query: 'dan',
    rows: [
      dana,
      {
        login: 'danny-b',
        name: 'Danny Brooks',
        initials: 'DB',
        joined: '12 Sep',
        orgs: 1,
        workspaces: 9,
        status: 'active',
      },
    ],
  },
  none: { query: 'ghost-user', rows: [] },
} as const satisfies Record<string, { query: string; rows: readonly UserRow[] }>
