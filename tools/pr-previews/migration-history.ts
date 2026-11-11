import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { queryDatabase } from './database.ts'
import type { OperationContext } from './operations.ts'
import { text } from './remote-values.ts'

export interface MigrationHash {
  name: string
  sha256: string
}
const TABLE = 'conductive_preview_migrations'

export async function migrationFiles(
  directory: string,
): Promise<MigrationHash[]> {
  const names = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  return Promise.all(
    names.map(async (name) => ({
      name,
      sha256: createHash('sha256')
        .update(await readFile(join(directory, name)))
        .digest('hex'),
    })),
  )
}

export async function recordedMigrations(
  ctx: OperationContext,
  database: string,
): Promise<MigrationHash[]> {
  const tables = await queryDatabase(
    ctx,
    database,
    `SELECT name FROM sqlite_schema WHERE type = 'table' AND name = '${TABLE}'`,
  )
  if (tables.length === 0) return []
  const rows = await queryDatabase(
    ctx,
    database,
    `SELECT name, sha256 FROM ${TABLE} ORDER BY name`,
  )
  return rows.map((row) => ({
    name: text(row.name, 'Migration name'),
    sha256: text(row.sha256, 'Migration digest'),
  }))
}

export function migrationDrift(
  recorded: MigrationHash[],
  current: MigrationHash[],
): boolean {
  const hashes = new Map(current.map((entry) => [entry.name, entry.sha256]))
  return recorded.some((entry) => hashes.get(entry.name) !== entry.sha256)
}

export async function recordMigrations(
  ctx: OperationContext,
  database: string,
  migrations: MigrationHash[],
): Promise<void> {
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
  const inserts = migrations.map(
    (entry) =>
      `INSERT INTO ${TABLE} (name, sha256) VALUES (${quote(entry.name)}, ${quote(entry.sha256)}) ON CONFLICT(name) DO UPDATE SET sha256 = excluded.sha256;`,
  )
  await queryDatabase(
    ctx,
    database,
    [
      `CREATE TABLE IF NOT EXISTS ${TABLE} (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL);`,
      ...inserts,
    ].join('\n'),
  )
}
