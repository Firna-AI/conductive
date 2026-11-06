import { readFile, readdir } from 'node:fs/promises'

import { unstable_splitSqlQuery } from 'wrangler'

export async function applyMigrations(db: D1Database) {
  const directory = `${import.meta.dirname}/../../migrations`
  const migrations = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  for (const name of migrations) {
    const sql = await readFile(`${directory}/${name}`, 'utf8')
    await db.batch(
      unstable_splitSqlQuery(sql).map((query) => db.prepare(query)),
    )
  }
}
