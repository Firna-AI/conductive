import { rmSync } from 'node:fs'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Miniflare } from 'miniflare'

import { readMigrationScripts, type MigrationScript } from './migrations'
import { testDirectory, testStorage } from './test-directory'

/**
 * Every test runtime names its D1 database with this id. Miniflare names the
 * database file after the id, so one migrated template fits each runtime.
 */
export const TEST_D1_ID = 'test-db'

let standaloneTemplate: Promise<string> | undefined

export interface MigratedStorage {
  path: string
  remove(): Promise<void>
}

/**
 * Copies the migrated template into `directory`, or into a new folder, for
 * the `resourcePersistencePath` of a new runtime. Test processes copy the
 * template of the global setup. A standalone caller builds one template for
 * its process. Each fixture removes its owned folder after the runtime closes.
 * The global teardown removes remaining run folders, including failed setup.
 */
export async function migratedStorage(
  directory?: string,
): Promise<MigratedStorage> {
  const storage = await testStorage()
  const template = storage?.template ?? (await standalone())
  const folder =
    directory === undefined
      ? await testDirectory('runtime-')
      : {
          path: directory,
          remove: () => rm(directory, { recursive: true, force: true }),
        }
  try {
    await cp(template, folder.path, { recursive: true })
    return folder
  } catch (error) {
    if (directory === undefined) await folder.remove()
    throw error
  }
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
