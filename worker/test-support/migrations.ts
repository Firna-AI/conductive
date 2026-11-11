import { readFile, readdir } from 'node:fs/promises'

import { unstable_splitSqlQuery } from 'wrangler'

export async function applyMigrations(
  db: D1Database,
  options: { before?: string; from?: string } = {},
) {
  const directory = `${import.meta.dirname}/../../migrations`
  const migrations = (await readdir(directory))
    .filter(
      (name) =>
        name.endsWith('.sql') &&
        (options.before === undefined || name < options.before) &&
        (options.from === undefined || name >= options.from),
    )
    .sort()
  for (const name of migrations) {
    const sql = await readFile(`${directory}/${name}`, 'utf8')
    await db.batch(
      unstable_splitSqlQuery(sql).map((query) => db.prepare(query)),
    )
  }
}
