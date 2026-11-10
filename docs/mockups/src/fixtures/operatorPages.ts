/**
 * The page of one org, as the operator opens it, in each state of the
 * page. The pages of a user are in `operatorUserPages.ts`.
 */
import type { StateCounts } from './operator'
import type {
  OrgMember,
  SuspensionNote,
  TargetStatus,
} from './operatorDirectory'
import type { AccountId } from './operatorProviders'
import { account } from './orgs'

/** The page of an org: its details, workspaces, and members. */
export type OrgPage = {
  id: string
  name: string
  initials: string
  /** The provider account of the org, which it keeps for its whole life. */
  account: AccountId
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
  { login: 'vex-ops', initials: 'V', role: 'Admin' },
  { login: 'kt-null', name: 'Kai Tanaka', initials: 'KT', role: 'Member' },
  {
    login: 'dana-k',
    name: 'Dana Kim',
    initials: 'DK',
    role: 'Member',
    suspended: true,
  },
]

const hexwave = {
  id: 'org_h3xw4v8q',
  name: 'Hexwave',
  initials: 'HW',
  account: 'boat',
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
    account: 'boat',
    created: '3 Nov 2026',
    repositories: 1,
    builds: 0,
    states: { running: 0, stopped: 4, failed: 0, archived: 0 },
    members: [
      { login: 'ana-p', name: 'Ana Pereira', initials: 'AP', role: 'Admin' },
      { login: 'joe-q', name: 'Joe Quinn', initials: 'JQ', role: 'Member' },
    ],
    deleted: { on: '5 Nov', purge: '12 Nov' },
  },
}

/** Pinecrest after an admin deleted it and the operator suspended it. */
export const suspendedDeletedOrg: OrgPage = {
  ...orgPages.deleted,
  suspension: { since: '8 Nov at 14:35', by: account.login, stopping: 0 },
}
