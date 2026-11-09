import type { OrgRole, User } from '../../shared/api'
import type { OperatorWorkspaceStates } from '../../shared/operator'
import { fakeUsers } from './core'

/**
 * An org of the operator samples, with the names and the counts of the
 * operator mockups. Each time counts back from the time of the samples, so
 * the tests and the dev fake show recent days.
 */
export interface SampleOrg {
  id: string
  name: string
  initials: string
  /** The days before the time of the samples when the org was created. */
  createdDaysAgo: number
  repositories: number
  states: OperatorWorkspaceStates
  /** The builds of its cloud computer that run now. */
  builds: number
  /** The login and the role of each member, admins first. */
  members: Readonly<Record<string, OrgRole>>
  /** The cloud computer IDs and preview hostnames that the search finds. */
  computers: readonly string[]
  previews: readonly string[]
}

/** A user of the operator samples, with the names of the operator mockups. */
export interface SampleUser {
  githubId: number
  login: string
  name: string | null
  /** The days before the time of the samples when the user joined. */
  joinedDaysAgo: number
  /** The workspaces that the user owns, and those of them that run. */
  owned: number
  running: number
}

function user(
  githubId: number,
  login: string,
  name: string | null,
  joinedDaysAgo: number,
  [owned, running]: readonly [number, number],
): SampleUser {
  return { githubId, login, name, joinedDaysAgo, owned, running }
}

/** A person of the other fixtures, who signs in to the app. */
function person(
  fixture: User,
  joinedDaysAgo: number,
  workspaces: readonly [number, number],
): SampleUser {
  const { githubId, githubLogin, displayName } = fixture
  return user(githubId, githubLogin, displayName, joinedDaysAgo, workspaces)
}

function org(
  id: string,
  name: string,
  initials: string,
  createdDaysAgo: number,
  fields: {
    repositories: number
    /** Running, stopped, failed, and archived. */
    states: readonly [number, number, number, number]
    members: Readonly<Record<string, OrgRole>>
    builds?: number
    computers?: readonly string[]
    previews?: readonly string[]
  },
): SampleOrg {
  const [running, stopped, failed, archived] = fields.states
  return {
    id,
    name,
    initials,
    createdDaysAgo,
    repositories: fields.repositories,
    states: { running, stopped, failed, archived },
    builds: fields.builds ?? 0,
    members: fields.members,
    computers: fields.computers ?? [],
    previews: fields.previews ?? [],
  }
}

const [cal, priya, jonas] = fakeUsers

/**
 * The users, newest first. A tie on one day goes by GitHub ID, as the
 * Worker orders it. The people of the other fixtures come last.
 */
export const sampleUsers: readonly SampleUser[] = [
  user(81234567, 'rho-9', 'Rhea Okafor', 0, [2, 1]),
  user(80555121, 'tide-sam', 'Sam Ortiz', 1, [3, 0]),
  user(61000001, 'ana-p', 'Ana Pereira', 5, [3, 0]),
  user(61000002, 'joe-q', 'Joe Quinn', 5, [1, 0]),
  user(66213409, 'kt-null', 'Kai Tanaka', 11, [2, 0]),
  user(77120345, 'vex-ops', null, 11, [6, 2]),
  user(58201734, 'dana-k', 'Dana Kim', 18, [14, 0]),
  user(52230011, 'mira-s', 'Mira Santos', 36, [23, 1]),
  user(50400999, 'li-wei', 'Li Wei', 110, [31, 2]),
  user(50400123, 'tomas-r', 'Tomás Ruiz', 125, [48, 3]),
  user(49876543, 'danny-b', 'Danny Brooks', 130, [9, 0]),
  person(priya, 138, [5, 0]),
  person(jonas, 138, [4, 0]),
  person(cal, 140, [41, 2]),
]

/** The orgs, newest first. The orgs of the people who sign in come last. */
export const sampleOrgs: readonly SampleOrg[] = [
  org('org_rh1n0d4t', 'Rhino Data', 'RD', 0, {
    repositories: 1,
    states: [1, 1, 0, 0],
    members: { 'rho-9': 'admin' },
  }),
  org('org_t1d3p00l', 'Tidepool', 'TP', 1, {
    repositories: 2,
    states: [0, 3, 0, 0],
    members: { 'tide-sam': 'admin', 'mira-s': 'member' },
  }),
  org('org_p1n3cr7t', 'Pinecrest', 'PC', 5, {
    repositories: 1,
    states: [0, 4, 0, 0],
    members: { 'ana-p': 'admin', 'joe-q': 'member' },
  }),
  org('org_n0rthst4r', 'Northstar Labs', 'NL', 6, {
    repositories: 2,
    states: [0, 5, 0, 0],
    members: { 'danny-b': 'admin', 'kt-null': 'member' },
  }),
  org('org_h3xw4v8q', 'Hexwave', 'HW', 11, {
    repositories: 2,
    states: [2, 7, 1, 0],
    members: { 'vex-ops': 'admin', 'kt-null': 'member', 'dana-k': 'member' },
    computers: ['sbx_7f3k9q2m'],
    previews: ['k7q2m9fz.conductive.page'],
  }),
  org('org_lum3nw0rk', 'Lumen Works', 'LW', 14, {
    repositories: 3,
    states: [1, 15, 0, 2],
    builds: 1,
    members: { 'li-wei': 'admin', 'mira-s': 'member' },
  }),
  org('org_d4n4l4b', 'Dana’s Lab', 'DL', 18, {
    repositories: 1,
    states: [0, 4, 0, 1],
    members: { 'dana-k': 'admin' },
  }),
  org('org_blu3h4rb', 'Blue Harbor', 'BH', 30, {
    repositories: 4,
    states: [2, 80, 1, 14],
    members: { 'mira-s': 'admin', 'tomas-r': 'member' },
  }),
  org('org_n0rthw1nd', 'Northwind', 'NW', 107, {
    repositories: 5,
    states: [4, 130, 2, 28],
    builds: 2,
    members: { 'li-wei': 'admin', 'tomas-r': 'member' },
  }),
  org('org_k3str3l', 'Kestrel Labs', 'KL', 123, {
    repositories: 6,
    states: [6, 150, 2, 54],
    members: { 'tomas-r': 'admin', 'li-wei': 'member' },
  }),
  org('org_0rb1tstd', 'Orbit Studio', 'OS', 128, {
    repositories: 3,
    states: [5, 60, 0, 20],
    members: { 'danny-b': 'admin' },
  }),
  org('acme', 'Acme', 'AC', 135, {
    repositories: 6,
    states: [3, 100, 1, 27],
    members: {
      [cal.githubLogin]: 'admin',
      [priya.githubLogin]: 'member',
      [jonas.githubLogin]: 'member',
    },
  }),
  org('firna', 'Firna', 'FI', 136, {
    repositories: 4,
    states: [0, 6, 0, 2],
    members: { [cal.githubLogin]: 'admin' },
  }),
  org('futex', 'Futex', 'FX', 137, {
    repositories: 3,
    states: [0, 3, 0, 1],
    members: { [cal.githubLogin]: 'admin' },
  }),
]

/** The IDs that the tests and the dev fake name. */
export const SAMPLE_IDS = {
  /** Hexwave, which the operator suspended 25 minutes ago. */
  suspendedOrg: 'org_h3xw4v8q',
  /** Pinecrest, which an admin deleted 3 days ago. */
  deletedOrg: 'org_p1n3cr7t',
  /** Northwind, an org in use with two running builds. */
  activeOrg: 'org_n0rthw1nd',
  /** Dana Kim, whom the operator suspended 2 days ago. */
  suspendedUser: 58201734,
  /** Mira Santos, a user in use. */
  activeUser: 52230011,
  /** The person signed in, whose own page warns before a suspension. */
  self: cal.githubId,
} as const
