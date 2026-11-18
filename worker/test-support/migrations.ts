import { readFile, readdir } from 'node:fs/promises'

declare module 'vitest' {
  interface ProvidedContext {
    migrationScripts?: MigrationScript[]
  }
}

export interface MigrationScript {
  name: string
  statements: string[]
}

const DIRECTORY = `${import.meta.dirname}/../../migrations`
let standaloneScripts: Promise<MigrationScript[]> | undefined

/**
 * Test processes read the scripts that the global setup split once, so they
 * do not import Wrangler. Standalone callers split them on demand.
 */
async function migrationScripts(): Promise<MigrationScript[]> {
  if (process.env.VITEST_WORKER_ID !== undefined) {
    const { inject } = await import('vitest')
    const provided = inject('migrationScripts')
    if (provided !== undefined) return provided
  }
  return (standaloneScripts ??= readMigrationScripts())
}

/** Reads each migration in filename order with Wrangler's SQL splitter. */
export async function readMigrationScripts(): Promise<MigrationScript[]> {
  const { unstable_splitSqlQuery } = await import('wrangler')
  const names = (await readdir(DIRECTORY))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  return Promise.all(
    names.map(async (name) => ({
      name,
      statements: unstable_splitSqlQuery(
        await readFile(`${DIRECTORY}/${name}`, 'utf8'),
      ),
    })),
  )
}

export async function applyMigrations(
  db: D1Database,
  options: { before?: string; from?: string } = {},
) {
  for (const { name, statements } of await migrationScripts()) {
    if (options.before !== undefined && name >= options.before) continue
    if (options.from !== undefined && name < options.from) continue
    await db.batch(statements.map((query) => db.prepare(query)))
  }
}
