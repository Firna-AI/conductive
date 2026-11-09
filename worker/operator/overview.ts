import type { OperatorOverview } from '../../src/shared/operator'
import {
  runningWorkspacePredicate,
  workspaceStateCounts,
} from './workspace-counts'

const DAY = 24 * 60 * 60 * 1_000

type DailyCount = OperatorOverview['newUsersByDay'][number]
type LargestOrg = OperatorOverview['largestOrgs'][number]
interface Totals {
  usersTotal: number
  usersLastWeek: number
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

function dailyCounts(rows: OverviewRow[], firstDay: number): DailyCount[] {
  const counts = new Map(
    rows.map((row) => {
      if (!('date' in row)) throw new Error('Invalid overview daily count')
      return [row.date, row.count]
    }),
  )
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(firstDay + index * DAY).toISOString().slice(0, 10)
    return { date, count: counts.get(date) ?? 0 }
  })
}

export async function readOperatorOverview(
  db: D1Database,
  readAt: number,
): Promise<OperatorOverview> {
  const day = new Date(readAt)
  day.setUTCHours(0, 0, 0, 0)
  const firstDay = day.getTime() - 29 * DAY
  const [counts, workspaceDays, userDays, orgs] = await db.batch<OverviewRow>([
    db
      .prepare(
        `SELECT * FROM (
           SELECT COUNT(*) AS usersTotal,
             COUNT(CASE WHEN created_at BETWEEN ?1 AND ?2 THEN 1 END) AS usersLastWeek
           FROM users
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
      .bind(readAt - 7 * DAY, readAt),
    db
      .prepare(
        `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS date,
           COUNT(*) AS count FROM workspaces WHERE created_at BETWEEN ? AND ?
         GROUP BY date ORDER BY date`,
      )
      .bind(firstDay, readAt),
    db
      .prepare(
        `SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS date,
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
