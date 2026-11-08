/** The users that the operator finds in the Users tab. */
import type { TargetStatus } from './operatorDirectory'

/** A user in the list of the Users tab. */
export type UserRow = {
  login: string
  name?: string
  initials: string
  joined: string
  orgs: number
  workspaces: number
  status: Exclude<TargetStatus, 'deleted'>
}

/** The newest users first, as the Users tab lists them with no search. */
export const newestUsers: readonly UserRow[] = [
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
  {
    login: 'vex-ops',
    initials: 'VO',
    joined: '28 Oct',
    orgs: 1,
    workspaces: 6,
    status: 'active',
  },
  {
    login: 'dana-k',
    name: 'Dana Kim',
    initials: 'DK',
    joined: '21 Oct',
    orgs: 2,
    workspaces: 14,
    status: 'suspended',
  },
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
  {
    login: 'tomas-r',
    name: 'Tomás Ruiz',
    initials: 'TR',
    joined: '30 Sep',
    orgs: 3,
    workspaces: 48,
    status: 'active',
  },
  {
    login: 'calummoore',
    name: 'Cal',
    initials: 'C',
    joined: '2 Sep',
    orgs: 3,
    workspaces: 41,
    status: 'active',
  },
]

/** The search of the Users tab, and what it finds. */
export const userSearches = {
  name: {
    query: 'dan',
    rows: [
      newestUsers[3],
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
