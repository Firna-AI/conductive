import type { AccountStatsNumbers } from '../../../../src/ui/components/settings/StatsSections'
import type { DailyCount } from '../../../../src/ui/components/settings/statCounts'

const DAY = 24 * 60 * 60 * 1_000

/**
 * The 30 UTC days up to Monday 16 November 2026, oldest first, each with
 * its count from `counts`.
 */
function lastThirtyDays(counts: readonly number[]): readonly DailyCount[] {
  const last = Date.parse('2026-11-16T00:00:00Z')
  return counts.map((count, index) => ({
    date: new Date(last - (counts.length - 1 - index) * DAY)
      .toISOString()
      .slice(0, 10),
    count,
  }))
}

/**
 * The numbers of the Stats tab of Cal's account: two orgs, the workspaces
 * that Cal owns, and the runs of Cal's automations. The last 7 days of the
 * new workspaces add up to the 7 new workspaces of the week. The states add
 * up to the 64 workspaces. Cal archived 49 of them: 9 in the last 14 days,
 * which the list still holds, and 40 that left it.
 */
export const accountStats: AccountStatsNumbers = {
  orgs: 2,
  workspaces: { total: 64, lastWeek: 7 },
  workspaceStates: {
    running: 3,
    stopped: 11,
    failed: 1,
    archived: 9,
    removed: 40,
  },
  automations: 3,
  newWorkspacesByDay: lastThirtyDays([
    1, 0, 2, 3, 1, 2, 0, 0, 3, 2, 4, 1, 2, 0, 0, 2, 3, 1, 2, 1, 0, 0, 2, 1, 3,
    1, 0, 0, 1, 1,
  ]),
  automationRunsByDay: lastThirtyDays([
    3, 1, 4, 3, 3, 4, 3, 1, 1, 3, 4, 5, 3, 3, 1, 1, 4, 3, 3, 4, 3, 1, 1, 3, 4,
    3, 4, 3, 1, 2,
  ]),
}

/**
 * A new account: one org, and no workspace and no automation yet. Each other
 * count is zero, and each day of the charts too.
 */
export const emptyAccountStats: AccountStatsNumbers = {
  orgs: 1,
  workspaces: { total: 0, lastWeek: 0 },
  workspaceStates: {
    running: 0,
    stopped: 0,
    failed: 0,
    archived: 0,
    removed: 0,
  },
  automations: 0,
  newWorkspacesByDay: lastThirtyDays(Array.from({ length: 30 }, () => 0)),
  automationRunsByDay: lastThirtyDays(Array.from({ length: 30 }, () => 0)),
}
