/**
 * The workspaces whose cloud computers run, as the Long runs list of the
 * Overview gives them, at three moments: the usual one with many runs, a
 * quiet one with three runs, and one with none. Each moment keeps the
 * counts of the page in line with its list.
 */
import {
  largestOrgs,
  runningComputers,
  workspaceStates,
  type OrgCounts,
} from './operator'
import { type StateCounts } from '../../../../src/ui/components/settings/statCounts'
import type { TargetStatus } from './operatorDirectory'
import type { ActivityStatus } from '../../../../src/ui/components/workspaces/activityStatus'

/** The states of a workspace whose cloud computer runs. */
type RunningState = Extract<
  ActivityStatus,
  'starting' | 'ready' | 'working' | 'unread' | 'input'
>

/** The org of a run, with the state that the line under its name shows. */
type RunOrg = { name: string; status: TargetStatus }

/**
 * The owner of a run: their GitHub login, and whether an operator
 * suspended them. A person who waits owns no workspace.
 */
export type RunOwner = { login: string; status: 'active' | 'suspended' }

/** A workspace whose cloud computer runs, as one row of the list. */
export type LongRun = {
  org: RunOrg
  owner: RunOwner
  /** The number of the workspace in its org. */
  number: number
  /** The ID of its cloud computer, or null until the computer exists. */
  computer: string | null
  state: RunningState
  /** The time since the last start of its cloud computer, in ms. */
  runningFor: number
  /** The last activity in the workspace, as the list writes it. */
  lastActivity: string
}

const minute = 60_000
const hour = 60 * minute

/** A run length of hours and minutes. */
function hours(whole: number, minutes = 0): number {
  return whole * hour + minutes * minute
}

/** An owner in use, as most rows have. */
function inUse(login: string): RunOwner {
  return { login, status: 'active' }
}

/**
 * A member whom an operator suspended while their cloud computer ran. Its
 * stop has not finished, so the run goes on. The catalogue draws no page
 * for this user, so the login opens the suspended user that it draws.
 */
const suspendedOwner: RunOwner = { login: 'pike-o', status: 'suspended' }

const kestrel: RunOrg = { name: 'Kestrel Labs', status: 'active' }
const acme: RunOrg = { name: 'Acme', status: 'active' }

/**
 * A deleted org whose cloud computer did not stop at the deletion. The
 * catalogue draws no page for it, so its name opens the deleted org that
 * the catalogue draws.
 */
const copperline: RunOrg = { name: 'Copperline', status: 'deleted' }

/** Hexwave after the suspension, while its 2 cloud computers still stop. */
const hexwave: RunOrg = { name: 'Hexwave', status: 'suspended' }

/** A member who keeps working, so the computer runs on. */
const steadyWork: LongRun = {
  org: kestrel,
  owner: inUse('tomas-r'),
  number: 205,
  computer: 'sbx_k2t9w4pd',
  state: 'working',
  runningFor: hours(43, 15),
  lastActivity: '3 minutes ago',
}

/** The 10 longest runs of the 37 running workspaces, longest first. */
const manyRuns: readonly LongRun[] = [
  {
    org: copperline,
    owner: inUse('cole-m'),
    number: 12,
    computer: 'sbx_c4p1m8rz',
    state: 'ready',
    runningFor: hours(98),
    lastActivity: '5 Nov',
  },
  {
    org: hexwave,
    owner: inUse('vex-ops'),
    number: 9,
    computer: 'sbx_7f3k9q2m',
    state: 'ready',
    runningFor: hours(54, 6),
    lastActivity: 'Yesterday',
  },
  steadyWork,
  {
    org: { name: 'Orbit Studio', status: 'active' },
    owner: inUse('danny-b'),
    number: 81,
    computer: 'sbx_o5b8x2jn',
    state: 'ready',
    runningFor: hours(31, 20),
    lastActivity: 'Yesterday',
  },
  {
    org: acme,
    owner: inUse('calummoore'),
    number: 396,
    computer: 'sbx_a6c3m9ve',
    state: 'ready',
    runningFor: hours(29, 2),
    lastActivity: '20 minutes ago',
  },
  {
    org: { name: 'Lumen Works', status: 'active' },
    owner: suspendedOwner,
    number: 17,
    computer: 'sbx_l7m2w9kc',
    state: 'ready',
    runningFor: hours(26, 30),
    lastActivity: 'Yesterday',
  },
  {
    org: hexwave,
    owner: inUse('kt-null'),
    number: 14,
    computer: 'sbx_h8w2v6qa',
    state: 'input',
    runningFor: hours(20, 15),
    lastActivity: 'Yesterday',
  },
  {
    org: { name: 'Northwind', status: 'active' },
    owner: inUse('li-wei'),
    number: 158,
    computer: 'sbx_n3w7d1fk',
    state: 'working',
    runningFor: hours(13, 40),
    lastActivity: '2 hours ago',
  },
  {
    org: kestrel,
    owner: inUse('li-wei'),
    number: 198,
    computer: 'sbx_k9s4l2ex',
    state: 'unread',
    runningFor: hours(9, 48),
    lastActivity: '7 hours ago',
  },
  {
    org: { name: 'Blue Harbor', status: 'active' },
    owner: inUse('mira-s'),
    number: 91,
    computer: 'sbx_b4h7r1mu',
    state: 'working',
    runningFor: hours(6, 5),
    lastActivity: '41 minutes ago',
  },
]

/**
 * A quiet moment with three runs. The newest started 41 seconds ago, and
 * its cloud computer does not exist yet, so it has no ID.
 */
const fewRuns: readonly LongRun[] = [
  { ...steadyWork, runningFor: hours(6, 40) },
  {
    org: acme,
    owner: inUse('calummoore'),
    number: 398,
    computer: 'sbx_a2p7y4lq',
    state: 'ready',
    runningFor: hours(1, 12),
    lastActivity: '12 minutes ago',
  },
  {
    org: acme,
    owner: inUse('calummoore'),
    number: 401,
    computer: null,
    state: 'starting',
    runningFor: 41_000,
    lastActivity: 'Just now',
  },
]

/** The moment of the Overview: many runs, a few, or none. */
export type RunsMoment = 'many' | 'few' | 'none'

/** The numbers of the page that the running workspaces change. */
export type OverviewRuns = {
  running: { workspaces: number; builds: number }
  states: StateCounts
  largestOrgs: readonly OrgCounts[]
  longRuns: readonly LongRun[]
}

/**
 * A quieter moment: only the workspaces of its list run, and the others
 * are stopped. The builds still run, and each largest org counts its runs
 * in the list.
 */
function quiet(runs: readonly LongRun[]): OverviewRuns {
  const workspaces = runs.length
  const stopped = workspaceStates.stopped + workspaceStates.running - workspaces
  return {
    running: { ...runningComputers, workspaces },
    states: { ...workspaceStates, running: workspaces, stopped },
    largestOrgs: largestOrgs.map((org) => ({
      ...org,
      running: runs.filter((run) => run.org.name === org.name).length,
    })),
    longRuns: runs,
  }
}

/** The numbers of each moment. */
export const overviewRuns: Readonly<Record<RunsMoment, OverviewRuns>> = {
  many: {
    running: runningComputers,
    states: workspaceStates,
    largestOrgs,
    longRuns: manyRuns,
  },
  few: quiet(fewRuns),
  none: quiet([]),
}
