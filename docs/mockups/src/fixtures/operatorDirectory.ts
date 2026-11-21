/**
 * The orgs that the operator finds in the Orgs tab, and the types that the
 * lists and the pages of orgs and users share.
 */
import type { AccountId } from './operatorProviders'

/** A user or an org as the operator sees it: in use, suspended, or deleted. */
export type TargetStatus = 'active' | 'suspended' | 'deleted'

/** An org in the list of the Orgs tab. */
export type OrgRow = {
  name: string
  initials: string
  created: string
  members: number
  workspaces: number
  running: number
  status: TargetStatus
  /** The provider account of the org, which it keeps for its whole life. */
  account: AccountId
  /** Why a search that is not a name found the org. */
  match?: string
}

/**
 * The newest orgs first, as the Orgs tab lists them with no search. Acme
 * Labs is the test org that the operator created on e2b. Every other org
 * is on boat.
 */
export const newestOrgs: readonly OrgRow[] = [
  {
    name: 'Acme Labs',
    initials: 'AL',
    created: '8 Nov',
    members: 1,
    workspaces: 0,
    running: 0,
    status: 'active',
    account: 'e2b',
  },
  {
    name: 'Rhino Data',
    initials: 'RD',
    created: '8 Nov',
    members: 1,
    workspaces: 2,
    running: 1,
    status: 'active',
    account: 'boat',
  },
  {
    name: 'Tidepool',
    initials: 'TP',
    created: '7 Nov',
    members: 2,
    workspaces: 3,
    running: 0,
    status: 'active',
    account: 'boat',
  },
  {
    name: 'Pinecrest',
    initials: 'PC',
    created: '3 Nov',
    members: 2,
    workspaces: 4,
    running: 0,
    status: 'deleted',
    account: 'boat',
  },
  {
    name: 'Hexwave',
    initials: 'HW',
    created: '28 Oct',
    members: 3,
    workspaces: 10,
    running: 2,
    status: 'suspended',
    account: 'boat',
  },
  {
    name: 'Lumen Works',
    initials: 'LW',
    created: '25 Oct',
    members: 4,
    workspaces: 18,
    running: 1,
    status: 'active',
    account: 'boat',
  },
  {
    name: 'Blue Harbor',
    initials: 'BH',
    created: '9 Oct',
    members: 11,
    workspaces: 97,
    running: 2,
    status: 'active',
    account: 'boat',
  },
  {
    name: 'Northwind',
    initials: 'NW',
    created: '30 Sep',
    members: 18,
    workspaces: 164,
    running: 4,
    status: 'active',
    account: 'boat',
  },
  {
    name: 'Kestrel Labs',
    initials: 'KL',
    created: '14 Sep',
    members: 24,
    workspaces: 212,
    running: 6,
    status: 'active',
    account: 'boat',
  },
]

/** The search of the Orgs tab, and what it finds. */
export const orgSearches = {
  name: {
    query: 'north',
    rows: [
      newestOrgs[7],
      {
        name: 'Northstar Labs',
        initials: 'NL',
        created: '2 Nov',
        members: 3,
        workspaces: 5,
        running: 0,
        status: 'active',
        account: 'boat',
      },
    ],
  },
  preview: {
    query: 'https://k7q2m9fz.conductive.page',
    rows: [{ ...newestOrgs[4], match: 'Preview address' }],
  },
  none: { query: 'acme-old', rows: [] },
} as const satisfies Record<string, { query: string; rows: readonly OrgRow[] }>

/** A member of an org, as the page of the org lists it. */
export type OrgMember = {
  login: string
  /** The name on GitHub, which some accounts do not give. */
  name?: string
  initials: string
  role: 'Admin' | 'Member'
  suspended?: boolean
}

/** When and by whom the operator suspended a user or an org. */
export type SuspensionNote = {
  since: string
  by: string
  /** The cloud computers that are still stopping, from the reply. */
  stopping: number
}
