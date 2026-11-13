/**
 * The numbers of the operator page: counts across every org, at one
 * moment. The page reads them again each time it opens.
 */

/** A total, and how many of it are new in the last 7 days. */
export type WeeklyCount = { total: number; lastWeek: number }

export const operatorTotals: {
  users: WeeklyCount
  orgs: WeeklyCount
  workspaces: WeeklyCount
} = {
  users: { total: 1284, lastWeek: 46 },
  orgs: { total: 312, lastWeek: 9 },
  workspaces: { total: 2481, lastWeek: 188 },
}

/** The time when the page read its numbers. */
export const operatorUpdatedAt = '14:32'

/**
 * The cloud computers that run now: those of the running workspaces, and
 * those of the builds of the cloud computer of an org.
 */
export const runningComputers = { workspaces: 37, builds: 2 } as const

/**
 * The states that the page counts the workspaces in. `archived` counts the
 * archived workspaces in the list, those of the last 14 days. `removed`
 * counts the archived workspaces whose 14 days ended, which left the list.
 * The app keeps the data of both.
 */
export type WorkspaceStateKey =
  'running' | 'stopped' | 'failed' | 'archived' | 'removed'

/**
 * The workspaces of one scope in each state. The counts of the app have no
 * `removed` until its API counts removed workspaces, so the page then
 * shows the other four states.
 */
export type StateCounts = Readonly<
  Record<Exclude<WorkspaceStateKey, 'removed'>, number> & { removed?: number }
>

/** The workspaces of every org in each state. They add up to the total. */
export const workspaceStates: StateCounts = {
  running: runningComputers.workspaces,
  stopped: 1604,
  failed: 12,
  archived: 203,
  removed: 625,
}

/**
 * The new workspaces of each day in UTC, for the 30 days up to Sunday
 * 8 November 2026. The last 7 days add up to the 188 new workspaces of the
 * week.
 */
export const newWorkspacesByDay: readonly DailyCount[] = [
  { date: '2026-10-10', count: 9 },
  { date: '2026-10-11', count: 8 },
  { date: '2026-10-12', count: 19 },
  { date: '2026-10-13', count: 21 },
  { date: '2026-10-14', count: 20 },
  { date: '2026-10-15', count: 22 },
  { date: '2026-10-16', count: 18 },
  { date: '2026-10-17', count: 10 },
  { date: '2026-10-18', count: 9 },
  { date: '2026-10-19', count: 23 },
  { date: '2026-10-20', count: 24 },
  { date: '2026-10-21', count: 22 },
  { date: '2026-10-22', count: 25 },
  { date: '2026-10-23', count: 21 },
  { date: '2026-10-24', count: 12 },
  { date: '2026-10-25', count: 11 },
  { date: '2026-10-26', count: 26 },
  { date: '2026-10-27', count: 29 },
  { date: '2026-10-28', count: 27 },
  { date: '2026-10-29', count: 28 },
  { date: '2026-10-30', count: 24 },
  { date: '2026-10-31', count: 14 },
  { date: '2026-11-01', count: 13 },
  { date: '2026-11-02', count: 31 },
  { date: '2026-11-03', count: 34 },
  { date: '2026-11-04', count: 33 },
  { date: '2026-11-05', count: 30 },
  { date: '2026-11-06', count: 28 },
  { date: '2026-11-07', count: 16 },
  { date: '2026-11-08', count: 16 },
]

/** A count of one UTC day. */
export type DailyCount = { date: string; count: number }

/**
 * The new users of each day in UTC, for the same 30 days. The last 7 days
 * add up to the 46 new users of the week.
 */
export const newUsersByDay: readonly DailyCount[] = [
  { date: '2026-10-10', count: 2 },
  { date: '2026-10-11', count: 2 },
  { date: '2026-10-12', count: 5 },
  { date: '2026-10-13', count: 6 },
  { date: '2026-10-14', count: 5 },
  { date: '2026-10-15', count: 6 },
  { date: '2026-10-16', count: 4 },
  { date: '2026-10-17', count: 2 },
  { date: '2026-10-18', count: 2 },
  { date: '2026-10-19', count: 6 },
  { date: '2026-10-20', count: 7 },
  { date: '2026-10-21', count: 6 },
  { date: '2026-10-22', count: 6 },
  { date: '2026-10-23', count: 5 },
  { date: '2026-10-24', count: 2 },
  { date: '2026-10-25', count: 2 },
  { date: '2026-10-26', count: 7 },
  { date: '2026-10-27', count: 8 },
  { date: '2026-10-28', count: 7 },
  { date: '2026-10-29', count: 7 },
  { date: '2026-10-30', count: 6 },
  { date: '2026-10-31', count: 3 },
  { date: '2026-11-01', count: 2 },
  { date: '2026-11-02', count: 8 },
  { date: '2026-11-03', count: 9 },
  { date: '2026-11-04', count: 7 },
  { date: '2026-11-05', count: 8 },
  { date: '2026-11-06', count: 6 },
  { date: '2026-11-07', count: 4 },
  { date: '2026-11-08', count: 4 },
]

/** An org of the largest orgs, with its counts. */
export type OrgCounts = {
  name: string
  members: number
  workspaces: number
  /** Its workspaces whose cloud computer runs now. */
  running: number
}

/** The five orgs with the most workspaces, largest first. */
export const largestOrgs: readonly OrgCounts[] = [
  { name: 'Kestrel Labs', members: 24, workspaces: 212, running: 6 },
  { name: 'Northwind', members: 18, workspaces: 164, running: 4 },
  { name: 'Acme', members: 9, workspaces: 131, running: 3 },
  { name: 'Blue Harbor', members: 11, workspaces: 97, running: 2 },
  { name: 'Orbit Studio', members: 6, workspaces: 85, running: 5 },
]
