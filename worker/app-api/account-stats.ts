import type { AccountStats } from '../../src/shared/account'
import {
  countWindows,
  createdDay,
  dailyCounts,
  workspaceStateCounts,
  type DailyCount,
} from '../operator/workspace-counts'

interface Totals {
  orgs: number
  workspacesTotal: number
  workspacesLastWeek: number
  running: number
  stopped: number
  failed: number
  archived: number
  routines: number
}

/** The orgs of the person that are not deleted. */
const liveOrg = `SELECT o.id FROM orgs o WHERE o.deleted_at IS NULL`

/**
 * Reads the counts of the Stats tab for one person in one D1 batch: the
 * orgs of the person, the workspaces and the routines that the person owns,
 * and the new workspaces and the routine runs of each of the 30 UTC days
 * through `readAt`. Deleted orgs and their records count nowhere. A routine
 * run counts for its owner at the time of the run, and a skipped run counts
 * nowhere, because it started no agent.
 */
export async function readAccountStats(
  db: D1Database,
  userId: string,
  readAt: number,
): Promise<AccountStats> {
  const { firstDay, weekStart } = countWindows(readAt)
  const [counts, workspaceDays, runDays] = await db.batch<Totals | DailyCount>([
    db
      .prepare(
        `SELECT * FROM (
           SELECT COUNT(*) AS orgs FROM org_members m
           WHERE m.user_id = ?1 AND m.org_id IN (${liveOrg})
         ) CROSS JOIN (
           SELECT COUNT(*) AS workspacesTotal,
             COUNT(CASE WHEN w.created_at BETWEEN ?2 AND ?3 THEN 1 END) AS workspacesLastWeek,
             ${workspaceStateCounts}
           FROM workspaces w
           WHERE w.owner_user_id = ?1 AND w.org_id IN (${liveOrg})
         ) CROSS JOIN (
           SELECT COUNT(*) AS routines FROM routines r
           WHERE r.owner_user_id = ?1 AND r.org_id IN (${liveOrg})
         )`,
      )
      .bind(userId, weekStart, readAt),
    db
      .prepare(
        `SELECT ${createdDay} AS date, COUNT(*) AS count FROM workspaces
         WHERE owner_user_id = ?1 AND org_id IN (${liveOrg})
           AND created_at BETWEEN ?2 AND ?3
         GROUP BY date ORDER BY date`,
      )
      .bind(userId, firstDay, readAt),
    db
      .prepare(
        `SELECT ${createdDay} AS date, COUNT(*) AS count FROM routine_runs
         WHERE owner_user_id = ?1 AND org_id IN (${liveOrg})
           AND state != 'skipped' AND created_at BETWEEN ?2 AND ?3
         GROUP BY date ORDER BY date`,
      )
      .bind(userId, firstDay, readAt),
  ])
  const totals = counts.results[0]
  if (!totals || !('workspacesTotal' in totals))
    throw new Error('Invalid account stats totals')
  return {
    readAt,
    orgs: totals.orgs,
    workspaces: {
      total: totals.workspacesTotal,
      lastWeek: totals.workspacesLastWeek,
    },
    workspaceStates: {
      running: totals.running,
      stopped: totals.stopped,
      failed: totals.failed,
      archived: totals.archived,
    },
    routines: totals.routines,
    newWorkspacesByDay: dailyCounts(workspaceDays.results, firstDay),
    routineRunsByDay: dailyCounts(runDays.results, firstDay),
  }
}
