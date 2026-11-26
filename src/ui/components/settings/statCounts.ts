/**
 * The states that the page counts the workspaces in. `archived` counts the
 * archived workspaces in the list, those of the last 14 days. `removed`
 * counts the archived workspaces whose 14 days ended, which left the list.
 * The app keeps the data of both.
 */
export type WorkspaceStateKey =
  'running' | 'stopped' | 'failed' | 'archived' | 'removed'

/** The workspaces of one scope in each state. */
export type StateCounts = Readonly<Record<WorkspaceStateKey, number>>

/** A count of one UTC day. */
export type DailyCount = { date: string; count: number }
