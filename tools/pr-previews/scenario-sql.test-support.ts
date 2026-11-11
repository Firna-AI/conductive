import { seedResources } from './d1.test-support.ts'
import type { ScenarioOptions } from './scenario.test-support.ts'

export async function seedScenarioDatabase(
  db: D1Database,
  options: ScenarioOptions,
) {
  await seedResources(db)
  if (options.recorded) {
    await db
      .prepare(
        'CREATE TABLE conductive_preview_migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)',
      )
      .run()
    if (options.recorded.length)
      await db.batch(
        options.recorded.map(({ name, sha256 }) =>
          db
            .prepare(
              'INSERT INTO conductive_preview_migrations (name, sha256) VALUES (?, ?)',
            )
            .bind(name, sha256),
        ),
      )
  }
}

export function traceSql(sql: string, trace: string[]) {
  let stage: string | undefined
  if (sql.includes("name = 'd1_migrations'")) stage = 'migrations:applied-table'
  else if (sql === 'SELECT name FROM d1_migrations')
    stage = 'migrations:applied'
  else if (sql.includes("name IN ('orgs', 'image_builds')"))
    stage = 'resources:known-tables'
  else if (sql.includes("name = 'conductive_preview_migrations'"))
    stage = 'migrations:table'
  else if (sql.startsWith('SELECT name, sha256')) stage = 'migrations:read'
  else if (
    sql.includes('CREATE TABLE IF NOT EXISTS conductive_preview_migrations')
  )
    stage = 'migrations:record'
  else if (sql === 'SELECT id FROM orgs') stage = 'resources:orgs'
  else if (sql.includes('pragma_table_info')) stage = 'resources:tables'
  else if (sql.startsWith('SELECT snapshot_name')) stage = 'resources:snapshots'
  else if (sql === 'SELECT id FROM image_builds') stage = 'resources:builds'
  if (stage && !(stage === 'resources:snapshots' && trace.at(-1) === stage))
    trace.push(stage)
}
