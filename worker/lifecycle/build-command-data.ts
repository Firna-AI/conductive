import { buildLogStatements } from './build-log-statements'

export async function recordBuildCommand(
  db: D1Database,
  buildId: string,
  processId: number,
  heading: string,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare('UPDATE image_build_jobs SET process_id = ? WHERE build_id = ?')
      .bind(processId, buildId),
    ...buildLogStatements(db, buildId, heading, now),
  ])
}
