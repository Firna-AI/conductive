import { savedImageName } from '../../worker/lifecycle/image-names.ts'
import { queryDatabase } from './database.ts'
import type { OperationContext } from './operations.ts'
import { text } from './remote-values.ts'

export interface PreviewResources {
  orgIds: string[]
  snapshots: string[]
}

export async function databaseResources(
  ctx: OperationContext,
  database: string,
): Promise<PreviewResources> {
  const known = await queryDatabase(
    ctx,
    database,
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('orgs', 'image_builds')",
  )
  const existing = new Set(
    known.map((row) => text(row.name, 'Application table name')),
  )
  const orgs = existing.has('orgs')
    ? await queryDatabase(ctx, database, 'SELECT id FROM orgs')
    : []
  const tables = await queryDatabase(
    ctx,
    database,
    "SELECT m.name FROM sqlite_schema AS m WHERE m.type = 'table' AND EXISTS (SELECT 1 FROM pragma_table_info(m.name) AS c WHERE c.name = 'snapshot_name') ORDER BY m.name",
  )
  const snapshots = new Set<string>()
  for (const row of tables) {
    const table = text(row.name, 'Snapshot table name').replaceAll('"', '""')
    const rows = await queryDatabase(
      ctx,
      database,
      `SELECT snapshot_name FROM "${table}" WHERE snapshot_name IS NOT NULL`,
    )
    for (const snapshot of rows)
      snapshots.add(text(snapshot.snapshot_name, 'Snapshot name'))
  }
  const builds = existing.has('image_builds')
    ? await queryDatabase(ctx, database, 'SELECT id FROM image_builds')
    : []
  for (const build of builds)
    snapshots.add(savedImageName(text(build.id, 'Image build ID')))
  return {
    orgIds: orgs.map((row) => text(row.id, 'Organization ID')),
    snapshots: [...snapshots],
  }
}
