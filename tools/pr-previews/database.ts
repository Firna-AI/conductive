import type { OperationContext } from './operations.ts'
import { array, json, record, text } from './remote-values.ts'
import { runWrangler } from './runtime.ts'

interface PreviewDatabase {
  name: string
  id: string
}

export async function listDatabases(
  ctx: OperationContext,
): Promise<PreviewDatabase[]> {
  const value = json(
    await runWrangler(ctx, ['d1', 'list', '--json']),
    'Wrangler',
  )
  return array(value, 'D1 databases').map((entry) => {
    const database = record(entry, 'D1 database')
    return {
      name: text(database.name, 'D1 database name'),
      id: text(database.uuid, 'D1 database ID'),
    }
  })
}

export async function findDatabase(
  ctx: OperationContext,
  name: string,
): Promise<PreviewDatabase | null> {
  return (
    (await listDatabases(ctx)).find((database) => database.name === name) ??
    null
  )
}

export async function createDatabase(
  ctx: OperationContext,
  name: string,
): Promise<PreviewDatabase> {
  await runWrangler(ctx, [
    'd1',
    'create',
    name,
    '--location',
    'weur',
    '--update-config=false',
  ])
  const value = record(
    json(await runWrangler(ctx, ['d1', 'info', name, '--json']), 'Wrangler'),
    'D1 database',
  )
  if (value.name !== name)
    throw new Error('Wrangler returned another D1 database.')
  return { name, id: text(value.uuid, 'D1 database ID') }
}

export async function deleteDatabase(
  ctx: OperationContext,
  name: string,
): Promise<void> {
  await runWrangler(ctx, ['d1', 'delete', name, '--skip-confirmation'])
}

export async function queryDatabase(
  ctx: OperationContext,
  name: string,
  sql: string,
): Promise<Record<string, unknown>[]> {
  const value = json(
    await runWrangler(ctx, [
      'd1',
      'execute',
      name,
      '--remote',
      '--json',
      '--command',
      sql,
    ]),
    'Wrangler',
  )
  return array(value, 'D1 statements').flatMap((entry) => {
    const statement = record(entry, 'D1 statement')
    if (statement.success !== true)
      throw new Error('Wrangler returned a failed D1 statement.')
    return array(statement.results, 'D1 rows').map((row) =>
      record(row, 'D1 row'),
    )
  })
}
