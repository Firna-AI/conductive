import { buildSnapshotStatement } from './build-data'
import { buildLogStatements } from './build-log-statements'
import type { RoutedCommand } from './command-intents'

/** The log lines of the snapshot step of a build or refresh. */
export const SNAPSHOT_START_LOG = 'Saving the cloud computer image.\n'
export const SNAPSHOT_DONE_LOG = 'Saved the cloud computer image.\n'

export async function recordBuildCommand(
  db: D1Database,
  buildId: string,
  command: RoutedCommand,
  heading: string,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'UPDATE image_build_jobs SET process_id = ?, command_route = ? WHERE build_id = ?',
      )
      .bind(command.processId, command.route, buildId),
    ...buildLogStatements(db, buildId, heading, now),
  ])
}

/**
 * Saves the name of a new snapshot with its log line, before the provider
 * call. A retry finds the saved name and writes no second line.
 */
export async function recordBuildSnapshot(
  db: D1Database,
  buildId: string,
  snapshotName: string,
  providerAccount: string,
  now: number,
): Promise<void> {
  await db.batch([
    buildSnapshotStatement(db, buildId, snapshotName, providerAccount),
    ...buildLogStatements(db, buildId, SNAPSHOT_START_LOG, now),
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
