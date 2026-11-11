import type {
  ImportLfsObject,
  ImportLfsRequest,
  ImportLfsResult,
} from '../../src/shared/conductor-import-lfs.ts'
import {
  importText,
  importInteger,
} from '../../src/shared/conductor-import-values.ts'
import type { AppDependencies, AppEnv } from '../env'
import { githubFailure } from '../github/parsers'
import { importUnavailable, type ImportActor } from './access'
import {
  reservationWriteGuard,
  reservationWriteBindings,
  type ReservationRow,
} from './reservation-data'
import { importRepositoryContext } from './repository-facts'
import { repositoryProof } from './repository-data'
import { readLfsBatch } from './lfs-batch'

async function requireOpenReservation(
  db: D1Database,
  actor: ImportActor,
  id: string,
  now: number,
) {
  const active = await db
    .prepare(
      `SELECT 1 FROM conductor_import_reservations WHERE id = ? AND ${reservationWriteGuard()}`,
    )
    .bind(id, ...reservationWriteBindings(actor, now))
    .first()
  if (!active) throw importUnavailable()
}

/** Advisory staging facts. No receipt or payload ledger is written. */
export async function readLfsAvailability(
  env: AppEnv,
  actor: ImportActor,
  row: ReservationRow,
  dependencies: AppDependencies,
  input: ImportLfsRequest,
): Promise<ImportLfsResult> {
  const facts = await repositoryProof(env.DB, row.id, input.factsId)
  const repositoryId = importInteger(facts.repositoryId)
  const fullName = importText(facts.fullName)
  if (importText(facts.branch) !== row.branch) throw importUnavailable()
  const current = async () => {
    const context = await importRepositoryContext(env, actor, row, dependencies)
    if (
      context.repository.id !== repositoryId ||
      context.repository.fullName.toLowerCase() !== fullName.toLowerCase()
    )
      throw importUnavailable()
    await requireOpenReservation(env.DB, actor, row.id, dependencies.now())
    return context
  }
  await current()
  const available: ImportLfsObject[] = []
  const missing: ImportLfsObject[] = []
  for (let index = 0; index < input.objects.length; index += 100) {
    const context = await current()
    const batch = input.objects.slice(index, index + 100)
    const result = await readLfsBatch(
      dependencies.fetch,
      context.repository.fullName,
      context.token,
      batch,
      dependencies.now,
    )
    await current()
    for (const object of batch) {
      const state = result.get(object.oid)
      if (state === undefined) throw githubFailure()
      if (state) available.push(object)
      else missing.push(object)
    }
  }
  await current()
  return { kind: 'repository.lfs', factsId: input.factsId, available, missing }
}
