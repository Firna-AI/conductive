import type { OperatorOverview } from '../../src/shared/operator'
import {
  countWindows,
  createdDay,
  dailyCounts,
  runningWorkspacePredicate,
  workspaceStateCounts,
  type DailyCount,
} from './workspace-counts'

type LargestOrg = OperatorOverview['largestOrgs'][number]
interface Totals {
  usersTotal: number
  usersLastWeek: number
  waiting: number
  orgsTotal: number
  orgsLastWeek: number
  workspacesTotal: number
  workspacesLastWeek: number
  running: number
  stopped: number
  failed: number
  archived: number
  builds: number
}
type OverviewRow = Totals | DailyCount | LargestOrg

export async function readOperatorOverview(
  db: D1Database,
  readAt: number,
): Promise<OperatorOverview> {
  const { firstDay, weekStart } = countWindows(readAt)
  const [counts, workspaceDays, userDays, orgs] = await db.batch<OverviewRow>([
    db
      .prepare(
        `SELECT * FROM (
           SELECT COUNT(*) AS usersTotal,
             COUNT(CASE WHEN created_at BETWEEN ?1 AND ?2 THEN 1 END) AS usersLastWeek
           FROM users
         ) CROSS JOIN (
           SELECT COUNT(*) AS waiting FROM users u WHERE u.suspended_at IS NULL
             AND NOT EXISTS (SELECT 1 FROM user_app_access a WHERE a.user_id = u.id)
         ) CROSS JOIN (
           SELECT COUNT(*) AS orgsTotal,
             COUNT(CASE WHEN created_at BETWEEN ?1 AND ?2 THEN 1 END) AS orgsLastWeek
           FROM orgs
         ) CROSS JOIN (
           SELECT COUNT(*) AS workspacesTotal,
             COUNT(CASE WHEN w.created_at BETWEEN ?1 AND ?2 THEN 1 END) AS workspacesLastWeek,
             ${workspaceStateCounts}
           FROM workspaces w
         ) CROSS JOIN (
           SELECT COUNT(*) AS builds FROM image_builds b
           JOIN image_build_jobs j ON j.build_id = b.id WHERE j.phase != 'done'
         )`,
      )
      .bind(weekStart, readAt),
    db
      .prepare(
        `SELECT ${createdDay} AS date,
           COUNT(*) AS count FROM workspaces WHERE created_at BETWEEN ? AND ?
         GROUP BY date ORDER BY date`,
      )
      .bind(firstDay, readAt),
    db
      .prepare(
        `SELECT ${createdDay} AS date,
           COUNT(*) AS count FROM users WHERE created_at BETWEEN ? AND ?
         GROUP BY date ORDER BY date`,
      )
      .bind(firstDay, readAt),
    db.prepare(
      `SELECT o.id, o.name, o.initials,
         (SELECT COUNT(*) FROM org_members m WHERE m.org_id = o.id) AS members,
         COUNT(w.id) AS workspaces,
         COUNT(CASE WHEN ${runningWorkspacePredicate} THEN 1 END) AS running
       FROM orgs o LEFT JOIN workspaces w ON w.org_id = o.id
       WHERE o.deleted_at IS NULL GROUP BY o.id
       ORDER BY workspaces DESC, o.name LIMIT 5`,
    ),
  ])
  const totals = counts.results[0]
  if (!totals || !('usersTotal' in totals))
    throw new Error('Invalid overview totals')
  const largestOrgs = orgs.results.map((row) => {
    if (!('id' in row)) throw new Error('Invalid overview org count')
    return row
  })
  return {
    readAt,
    users: { total: totals.usersTotal, lastWeek: totals.usersLastWeek },
    waiting: totals.waiting,
    orgs: { total: totals.orgsTotal, lastWeek: totals.orgsLastWeek },
    workspaces: {
      total: totals.workspacesTotal,
      lastWeek: totals.workspacesLastWeek,
    },
    running: { workspaces: totals.running, builds: totals.builds },
    workspaceStates: {
      running: totals.running,
      stopped: totals.stopped,
      failed: totals.failed,
      archived: totals.archived,
    },
    newWorkspacesByDay: dailyCounts(workspaceDays.results, firstDay),
    newUsersByDay: dailyCounts(userDays.results, firstDay),
    largestOrgs,
  }
}
