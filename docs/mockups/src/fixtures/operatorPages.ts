/**
 * The page of one org and of one user, as the operator opens them, in
 * each state of the pages.
 */
import type { StateCounts } from './operator'
import type {
  OrgMember,
  SuspensionNote,
  TargetStatus,
} from './operatorDirectory'
import { account } from './orgs'

/** The page of an org: its details, workspaces, and members. */
export type OrgPage = {
  id: string
  name: string
  initials: string
  created: string
  repositories: number
  states: StateCounts
  /** The builds of its cloud computer that run now. */
  builds: number
  members: readonly OrgMember[]
  suspension?: SuspensionNote
  /** The day of the delete, and the day when everything is deleted. */
  deleted?: { on: string; purge: string }
}

const hexwaveMembers: readonly OrgMember[] = [
  { login: 'vex-ops', initials: 'VO', role: 'Admin' },
  { login: 'kt-null', initials: 'KN', role: 'Member' },
  { login: 'dana-k', initials: 'DK', role: 'Member', suspended: true },
]

const hexwave = {
  id: 'org_h3xw4v8q',
  name: 'Hexwave',
  initials: 'HW',
  created: '28 Oct 2026',
  repositories: 2,
  builds: 0,
  members: hexwaveMembers,
} as const

/** The page of each state of an org that the operator can open. */
export const orgPages: Readonly<Record<TargetStatus, OrgPage>> = {
  active: {
    ...hexwave,
    states: { running: 3, stopped: 6, failed: 1, archived: 0 },
  },
  suspended: {
    ...hexwave,
    states: { running: 2, stopped: 7, failed: 1, archived: 0 },
    suspension: { since: '8 Nov at 14:35', by: account.login, stopping: 2 },
  },
  deleted: {
    id: 'org_p1n3cr7t',
    name: 'Pinecrest',
    initials: 'PC',
    created: '3 Nov 2026',
    repositories: 1,
    builds: 0,
    states: { running: 0, stopped: 4, failed: 0, archived: 0 },
    members: [
      { login: 'ana-p', initials: 'AP', role: 'Admin' },
      { login: 'joe-q', initials: 'JQ', role: 'Member' },
    ],
    deleted: { on: '5 Nov', purge: '12 Nov' },
  },
}

/** An org of a user, with the role of the user in it. */
export type UserOrg = {
  name: string
  initials: string
  role: 'Admin' | 'Member'
}

/** The page of a user: their details, workspaces, and orgs. */
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
} as const

/** The pages of a user: in use, suspended, and the operator's own. */
export const userPages = {
  active: { ...dana, running: 1 },
  suspended: {
    ...dana,
    running: 0,
    suspension: { since: '6 Nov at 09:12', by: account.login, stopping: 0 },
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
  },
} as const satisfies Record<string, UserPage>
