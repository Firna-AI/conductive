import { onTestFinished } from 'vitest'
import { unstable_splitSqlQuery } from 'wrangler'
import {
  createHarness,
  type TestHarness,
} from '../../worker/test-support/harness.ts'
import type { CommandReply } from './operations.ts'

export function localDatabase(seed?: (db: D1Database) => Promise<void>) {
  let harness: Promise<TestHarness> | undefined
  onTestFinished(async () => {
    if (harness) await (await harness).dispose()
  })
  const database = async () => {
    harness ??= createHarness()
    return (await harness).env.DB
  }
  let initialized: Promise<D1Database> | undefined
  const ready = () =>
    (initialized ??= database().then(async (db) => {
      await seed?.(db)
      return db
    }))
  return {
    database: ready,
    reset: async () => {
      if (harness) await (await harness).dispose()
      harness = undefined
      initialized = undefined
    },
    execute: async (sql: string): Promise<CommandReply> => {
      const db = await ready()
      try {
        const results = await db.batch(
          unstable_splitSqlQuery(sql).map((query) => db.prepare(query)),
        )
        return { exitCode: 0, stdout: JSON.stringify(results), stderr: '' }
      } catch (error) {
        return { exitCode: 1, stdout: '', stderr: String(error) }
      }
    },
  }
}

export async function seedResources(
  db: D1Database,
  snapshot = 'stored-snapshot',
) {
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('user-a', 1, 'tester', 0, 0)",
    ),
    db.prepare(
      "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('org-a', 'Test org', 'user-a', 0)",
    ),
    db
      .prepare(
        "INSERT INTO image_builds (id, org_id, kind, state, snapshot_name, settings_revision, runner_protocol_version, started_at) VALUES ('a', 'org-a', 'build', 'succeeded', ?, 1, 1, 0)",
      )
      .bind(snapshot),
  ])
}

export async function emptyDatabase(db: D1Database) {
  const tables = await db
    .prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite_%'",
    )
    .all<{ name: string }>()
  const references = await db.batch<{ parent: string }>(
    tables.results.map(({ name }) =>
      db
        .prepare('SELECT "table" AS parent FROM pragma_foreign_key_list(?)')
        .bind(name),
    ),
  )
  const pending = new Map(
    tables.results.map(({ name }, index) => [
      name,
      new Set(references[index].results.map(({ parent }) => parent)),
    ]),
  )
  while (pending.size) {
    const name = [...pending.keys()].find((candidate) =>
      [...pending].every(
        ([child, parents]) => child === candidate || !parents.has(candidate),
      ),
    )
    if (!name)
      throw new Error('The empty database fixture has cyclic foreign keys.')
    await db.prepare(`DROP TABLE "${name.replaceAll('"', '""')}"`).run()
    pending.delete(name)
  }
}
