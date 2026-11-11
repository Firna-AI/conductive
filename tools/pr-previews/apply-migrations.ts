import { queryDatabase } from './database.ts'
import { recordMigrations, type MigrationHash } from './migration-history.ts'
import type { OperationContext } from './operations.ts'
import { text } from './remote-values.ts'
import { runWrangler } from './runtime.ts'

export async function applyMigrations(
  ctx: OperationContext,
  database: string,
  config: string,
  files: MigrationHash[],
): Promise<void> {
  try {
    await runWrangler(ctx, [
      'd1',
      'migrations',
      'apply',
      'DB',
      '--remote',
      '--config',
      config,
    ])
  } catch (error) {
    try {
      const tables = await queryDatabase(
        ctx,
        database,
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'd1_migrations'",
      )
      if (tables.length) {
        const rows = await queryDatabase(
          ctx,
          database,
          'SELECT name FROM d1_migrations',
        )
        const applied = new Set(
          rows.map((row) => text(row.name, 'Applied migration name')),
        )
        await recordMigrations(
          ctx,
          database,
          files.filter((file) => applied.has(file.name)),
        )
      }
    } catch {
      throw new Error(
        'Migration apply failed and applied hashes could not be saved. Rerun the same commit before changing migrations.',
      )
    }
    throw error
  }
  await recordMigrations(ctx, database, files)
}
