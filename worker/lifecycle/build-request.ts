import type { ImageBuild } from '../../src/shared/org-settings'

/**
 * A Build computer click during a refresh saves a request on the refresh.
 * The build then starts for that admin when the refresh ends, after a
 * success or a failure.
 */

/** A request holds only on a refresh that runs and is no switch build. */
const requestableRefresh = `EXISTS (SELECT 1 FROM image_builds b
  WHERE b.id = image_build_jobs.build_id AND b.kind = 'refresh'
    AND b.state = 'running' AND b.operator_switch_id IS NULL
    AND b.waiting_for_switch_id IS NULL)`

/**
 * Saves the request of `userId` on the refresh `buildId`. A later request
 * replaces the admin. Returns false when the refresh no longer runs, so
 * that the caller starts the build at once.
 */
export async function requestBuildAfterRefresh(
  db: D1Database,
  buildId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE image_build_jobs SET requested_build_user_id = ?
       WHERE build_id = ? AND ${requestableRefresh}`,
    )
    .bind(userId, buildId)
    .run()
  return result.meta.changes === 1
}

/**
 * Takes the request of a job that ended, once. The job no longer runs, so
 * no new request can land on it after this read.
 */
export async function takeBuildRequest(
  db: D1Database,
  buildId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT j.requested_build_user_id AS userId FROM image_build_jobs j
       JOIN image_builds b ON b.id = j.build_id
       WHERE j.build_id = ? AND b.state != 'running'
         AND j.requested_build_user_id IS NOT NULL`,
    )
    .bind(buildId)
    .first<{ userId: string }>()
  if (!row) return null
  const cleared = await db
    .prepare(
      `UPDATE image_build_jobs SET requested_build_user_id = NULL
       WHERE build_id = ? AND requested_build_user_id = ?`,
    )
    .bind(buildId, row.userId)
    .run()
  return cleared.meta.changes === 1 ? row.userId : null
}

/**
 * A new build that is no switch build takes in each saved request of the
 * org, so a refresh that ends after it starts no second build. It runs in
 * the batch that inserts the build, and only when that insert did.
 */
export function clearBuildRequestsStatement(
  db: D1Database,
  orgId: string,
  buildId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE image_build_jobs SET requested_build_user_id = NULL
       WHERE requested_build_user_id IS NOT NULL
         AND build_id IN (SELECT id FROM image_builds WHERE org_id = ?)
         AND EXISTS (SELECT 1 FROM image_builds WHERE id = ?)`,
    )
    .bind(orgId, buildId)
}

/** The SQL value of a build row: 1 when a running refresh has a request. */
export function buildRequestedColumn(build: string): string {
  return `(SELECT 1 FROM image_build_jobs j WHERE j.build_id = ${build}.id
    AND ${build}.state = 'running' AND j.requested_build_user_id IS NOT NULL)`
}

/** A build row as D1 returns it, with the request as a number. */
export type BuildRow = Omit<ImageBuild, 'buildRequested'> & {
  buildRequested: number | null
}

/** The build of a row. Only a running refresh with a request names it. */
export function readBuildRow(row: BuildRow): ImageBuild {
  const { buildRequested, ...build } = row
  return buildRequested === 1 ? { ...build, buildRequested: true } : build
}
