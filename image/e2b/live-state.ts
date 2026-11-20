import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { Miniflare } from 'miniflare'
import { unstable_splitSqlQuery } from 'wrangler'

const migrationName = '202611101110_e2b_provider_state.sql'

async function migrate(db: D1Database, root: string): Promise<void> {
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS conductive_live_migrations (name TEXT PRIMARY KEY)',
    )
    .run()
  const applied = await db
    .prepare('SELECT name FROM conductive_live_migrations WHERE name = ?')
    .bind(migrationName)
    .first<string>('name')
  if (applied) return
  const source = await readFile(join(root, 'migrations', migrationName), 'utf8')
  await db.batch([
    ...unstable_splitSqlQuery(source).map((query) => db.prepare(query)),
    db
      .prepare('INSERT INTO conductive_live_migrations (name) VALUES (?)')
      .bind(migrationName),
  ])
}

/** Keep only provider state here. This database has no app users or orgs. */
export async function openLiveState(root: string, directory: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  const runtime = new Miniflare({
    host: '127.0.0.1',
    port: 0,
    resourcePersistencePath: join(directory, 'storage'),
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    logRequests: false,
    workers: [
      {
        config: {
          name: 'conductive-e2b-live',
          compatibilityDate: '2026-11-06',
          env: { DB: { type: 'd1', id: 'conductive-e2b-live' } },
          manifest: {
            mainModule: 'index.js',
            modules: {
              'index.js': {
                type: 'esm',
                contents:
                  'export default {fetch() {return new Response(null, {status: 404})}}',
              },
            },
          },
        },
      },
    ],
  })
  try {
    const { DB: db } = await runtime.getBindings<{ DB: D1Database }>()
    await migrate(db, root)
    return { db, close: () => runtime.dispose() }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}
