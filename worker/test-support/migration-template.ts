import { Miniflare } from 'miniflare'

import type { MigrationScript } from './migrations'
import { TEST_D1_ID } from './migrated-storage'

/**
 * Applies every migration once to a persisted D1 database. Test runtimes
 * copy the folder instead of applying the migrations again.
 */
export async function buildMigrationTemplate(
  scripts: readonly MigrationScript[],
  path: string,
): Promise<string> {
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    resourcePersistencePath: path,
    workers: [
      {
        config: {
          name: 'migration-template',
          compatibilityDate: '2026-11-06',
          env: { DB: { type: 'd1', id: TEST_D1_ID } },
          manifest: {
            mainModule: 'index.js',
            modules: {
              'index.js': {
                type: 'esm',
                contents: 'export default { fetch: () => new Response() }',
              },
            },
          },
        },
      },
    ],
  })
  try {
    const db = await runtime.getD1Database('DB')
    for (const { statements } of scripts)
      await db.batch(statements.map((query) => db.prepare(query)))
  } finally {
    await runtime.dispose()
  }
  return path
}
