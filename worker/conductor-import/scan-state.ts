import type {
  ImportRowState,
  ImportScanRow,
} from '../../src/shared/conductor-import-operation.ts'
import type { ImportActor } from './access'
import { importRepository } from './access'
import { activeReservation } from './reservation-data'

export async function importScanState(
  db: D1Database,
  actor: ImportActor,
  row: ImportScanRow,
  now: number,
): Promise<ImportRowState> {
  const workspace = await db
    .prepare(
      'SELECT id FROM workspaces WHERE org_id = ? AND conductor_local_id = ?',
    )
    .bind(actor.orgId, row.localWorkspaceId)
    .first<{ id: string }>()
  if (workspace) return { state: 'imported', workspaceId: workspace.id }
  if (row.branch === null) return { state: 'unavailable' }
  if (!(await importRepository(db, actor, row, now)))
    return { state: 'unavailable' }
  const pending = await activeReservation(db, actor.orgId, row.localWorkspaceId)
  if (pending && pending.state === 'open' && pending.expiresAt > now)
    return {
      state: 'unfinished',
      reservationId:
        pending.importerUserId === actor.userId ? pending.id : null,
      storedBytes: pending.storedBytes,
      expiresAt: pending.expiresAt,
    }
  return { state: 'available' }
}
