import { rmSync } from 'node:fs'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Miniflare } from 'miniflare'

import { readMigrationScripts, type MigrationScript } from './migrations'

declare module 'vitest' {
  interface ProvidedContext {
    /** The global setup deletes `directory` with each folder inside it. */
    testStorage?: { template: string; directory: string }
  }
}

/**
 * Every test runtime names its D1 database with this id. Miniflare names the
 * database file after the id, so one migrated template fits each runtime.
 */
export const TEST_D1_ID = 'test-db'

let standaloneTemplate: Promise<string> | undefined

async function testStorage() {
  if (process.env.VITEST_WORKER_ID === undefined) return undefined
  const { inject } = await import('vitest')
  return inject('testStorage')
}

export interface MigratedStorage {
  path: string
  remove(): Promise<void>
}

/**
 * Copies the migrated template into `directory`, or into a new folder, for
 * the `resourcePersistencePath` of a new runtime. Test processes copy the
 * template of the global setup. A standalone caller builds one template for
 * its process. A runtime that its caller disposes can skip `remove`, because
 * the global teardown deletes the folder.
 */
export async function migratedStorage(
  directory?: string,
): Promise<MigratedStorage> {
  const storage = await testStorage()
  const template = storage?.template ?? (await standalone())
  const path =
    directory ??
    (await mkdtemp(join(storage?.directory ?? tmpdir(), 'runtime-')))
  await cp(template, path, { recursive: true })
  return { path, remove: () => rm(path, { recursive: true, force: true }) }
}

function standalone(): Promise<string> {
  return (standaloneTemplate ??= (async () => {
    const path = await mkdtemp(join(tmpdir(), 'conductive-test-template-'))
    process.once('exit', () => rmSync(path, { recursive: true, force: true }))
    return buildMigrationTemplate(await readMigrationScripts(), path)
  })())
}

/** Applies every migration once to a persisted D1 database in `path`. */
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
