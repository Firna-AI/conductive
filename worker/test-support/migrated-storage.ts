import { cp, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'

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

async function testStorage() {
  if (process.env.VITEST_WORKER_ID === undefined) return undefined
  const { inject } = await import('vitest')
  return inject('testStorage')
}

/**
 * Copies the migrated template of the global setup into `directory`, the
 * `resourcePersistencePath` of a new runtime. Without a template it copies
 * nothing and returns false, so the caller applies the migrations itself.
 */
export async function copyMigratedStorage(directory: string): Promise<boolean> {
  const storage = await testStorage()
  if (storage === undefined) return false
  await cp(storage.template, directory, { recursive: true })
  return true
}

export interface MigratedStorage {
  path: string
  remove(): Promise<void>
}

/**
 * A new storage folder with the migrated database, or null without a
 * template. A runtime that its caller disposes can skip `remove`, because the
 * global teardown deletes the folder.
 */
export async function migratedStorage(): Promise<MigratedStorage | null> {
  const storage = await testStorage()
  if (storage === undefined) return null
  const path = await mkdtemp(join(storage.directory, 'runtime-'))
  await cp(storage.template, path, { recursive: true })
  return { path, remove: () => rm(path, { recursive: true, force: true }) }
}
