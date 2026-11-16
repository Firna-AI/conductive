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
  removed: number
  automations: number
}

/**
 * The join that keeps the rows of `table` in orgs that are not deleted.
 * Each query finds the rows of the person through an owner index first.
 */
function inLiveOrg(table: string): string {
  return `JOIN orgs o ON o.id = ${table}.org_id AND o.deleted_at IS NULL`
}

/**
 * Reads the counts of the Stats tab for one person in one D1 batch: the
 * orgs of the person, the workspaces and the automations that the person owns,
 * and the new workspaces and the automation runs of each of the 30 UTC days
 * through `readAt`. Deleted orgs and their records count nowhere. A automation
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
           SELECT COUNT(*) AS orgs FROM org_members m ${inLiveOrg('m')}
           WHERE m.user_id = ?1
         ) CROSS JOIN (
           SELECT COUNT(*) AS workspacesTotal,
             COUNT(CASE WHEN w.created_at BETWEEN ?2 AND ?3 THEN 1 END) AS workspacesLastWeek,
             ${workspaceStateCounts('?3')}
           FROM workspaces w ${inLiveOrg('w')}
           WHERE w.owner_user_id = ?1
         ) CROSS JOIN (
           SELECT COUNT(*) AS automations FROM automations r ${inLiveOrg('r')}
           WHERE r.owner_user_id = ?1
         )`,
      )
      .bind(userId, weekStart, readAt),
    db
      .prepare(
        `SELECT ${createdDay('w')} AS date, COUNT(*) AS count
         FROM workspaces w ${inLiveOrg('w')}
         WHERE w.owner_user_id = ?1 AND w.created_at BETWEEN ?2 AND ?3
         GROUP BY date ORDER BY date`,
      )
      .bind(userId, firstDay, readAt),
    db
      .prepare(
        `SELECT ${createdDay('r')} AS date, COUNT(*) AS count
         FROM automation_runs r ${inLiveOrg('r')}
         WHERE r.owner_user_id = ?1 AND r.state != 'skipped'
           AND r.created_at BETWEEN ?2 AND ?3
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
    // The tab has no Removed state, so it counts a removed workspace as
    // Archived, as the archived count of the SQL does.
    workspaceStates: {
      running: totals.running,
      stopped: totals.stopped,
      failed: totals.failed,
      archived: totals.archived,
    },
    automations: totals.automations,
    newWorkspacesByDay: dailyCounts(workspaceDays.results, firstDay),
    automationRunsByDay: dailyCounts(runDays.results, firstDay),
  }
}
