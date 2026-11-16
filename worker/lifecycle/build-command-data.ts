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

/**
 * Saves the apt part version of a software command before its start. A
 * repeated start reaches the command that the first start sent, as the
 * command journal says. So when two starts carry different versions, the
 * job keeps the empty version, which no build treats as current.
 */
export async function recordSoftwarePackages(
  db: D1Database,
  buildId: string,
  packagesVersion: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE image_build_jobs SET packages_version = CASE
         WHEN packages_version IS NULL OR packages_version = ? THEN ?
         ELSE '' END
       WHERE build_id = ?`,
    )
    .bind(packagesVersion, packagesVersion, buildId)
    .run()
}
