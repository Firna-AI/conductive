import type {
  ConductorImportStorage,
  ImportStorageScope,
} from '../../src/shared/conductor-import-storage.ts'
import { readReservation } from './reservation-data'
import {
  markImportDeletion,
  readImportCleanup,
  requestImportCleanup,
} from './cleanup-data'

export async function runImportCleanup(
  db: D1Database,
  scope: ImportStorageScope,
  storage: ConductorImportStorage,
  now: () => number,
  schedule: (when: number | null) => Promise<void>,
) {
  const id = scope.reservationId
  let job = await readImportCleanup(db, id)
  if (!job || job.orgId !== scope.orgId) return true
  const row = await readReservation(db, id)
  const org = await db
    .prepare('SELECT id FROM orgs WHERE id = ?')
    .bind(job.orgId)
    .first()
  if (
    !org ||
    (row &&
      (row.state === 'expired' ||
        row.state === 'superseded' ||
        row.state === 'deleting' ||
        (row.state === 'open' && row.expiresAt <= now())))
  ) {
    await requestImportCleanup(db, id, 'all', now())
    job = await readImportCleanup(db, id)
  }
  if (!job || job.finishedAt !== null) return true
  if (job.group === 'none') {
    await schedule(job.dueAt)
    return false
  }
  if (job.inFlight) {
    await schedule(now() + 30_000)
    return false
  }
  try {
    await storage.deleteObjects(job.group === 'work' ? 'work' : undefined)
  } catch (error) {
    await schedule(now() + 30_000)
    throw error
  }
  const finishedAt = now()
  const next = finishedAt < job.latestTargetAt ? job.latestTargetAt : null
  await markImportDeletion(db, id, finishedAt, next)
  await schedule(next)
  return next === null
}
