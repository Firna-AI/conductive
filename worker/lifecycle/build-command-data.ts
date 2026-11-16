import { buildLogStatements } from './build-log-statements'

export async function recordBuildCommand(
  db: D1Database,
  buildId: string,
  processId: number,
  heading: string,
  now: number,
  packagesVersion: string | null = null,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'UPDATE image_build_jobs SET process_id = ?, packages_version = COALESCE(?, packages_version) WHERE build_id = ?',
      )
      .bind(processId, packagesVersion, buildId),
    ...buildLogStatements(db, buildId, heading, now),
  ])
}
