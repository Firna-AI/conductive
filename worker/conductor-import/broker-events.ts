import type {
  ImportControlResult,
  ImportDeviceEvent,
  ImportPublicEvent,
} from '../../src/shared/conductor-import-operation.ts'
import { importPage } from '../../src/shared/conductor-import-pages.ts'
import type { AppEnv } from '../env'
import { importUnavailable } from './access'
import { activeReservation, readReservation } from './reservation-data'
import { importServiceName } from './runtime'
import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { callImportService } from './client'
import { importScanState } from './scan-state'
import { publicImportReservation } from './public-values'
import type { ImportOperation } from './broker-types'

export async function applyImportEvent(
  env: AppEnv,
  operation: ImportOperation,
  event: ImportDeviceEvent,
  now: () => number,
  emit: (operation: ImportOperation, event: ImportPublicEvent) => Promise<void>,
): Promise<ImportControlResult> {
  const action = operation.action
  if (
    event.kind === 'done' ||
    event.kind === 'failed' ||
    event.kind === 'status'
  ) {
    await emit(operation, event)
    return { kind: 'accepted' }
  }
  if (event.kind === 'scan') {
    if (action.action !== 'scan') throw importUnavailable()
    const rows = []
    for (const row of event.rows)
      rows.push({
        ...row,
        ...(await importScanState(env.DB, operation.actor, row, now())),
      })
    while (rows.length) {
      const page = importPage(rows, (rows) => ({ kind: 'scan', rows }))
      await emit(operation, { kind: 'scan', rows: page })
      rows.splice(0, page.length)
    }
    return { kind: 'accepted' }
  }
  if (action.action !== 'upload' && action.action !== 'retry')
    throw importUnavailable()
  if (event.kind === 'result.files' || event.kind === 'result.sessions') {
    if (event.localWorkspaceId !== action.localWorkspaceId)
      throw importUnavailable()
    await emit(operation, event)
    return { kind: 'accepted' }
  }
  if (event.kind === 'reserve') {
    if (
      event.row.localWorkspaceId !== action.localWorkspaceId ||
      (event.replace &&
        (action.action !== 'retry' ||
          event.replace.reservationId !== action.reservationId))
    )
      throw importUnavailable()
    const previous = await activeReservation(
      env.DB,
      operation.actor.orgId,
      event.row.localWorkspaceId,
    )
    if (previous?.state === 'open' && previous.expiresAt <= now())
      requireFeatureResult(
        await workspaceBinding(env)
          .getByName(importServiceName(previous.id))
          .cleanupConductorImport(
            { orgId: previous.orgId, reservationId: previous.id },
            'all',
          ),
      )
    const id = crypto.randomUUID()
    const reply = await callImportService(env, operation.actor, id, event)
    if (reply.kind !== 'reservation') throw importUnavailable()
    operation.reservations.add(reply.reservation.id)
    if (event.replace)
      requireFeatureResult(
        await workspaceBinding(env)
          .getByName(importServiceName(event.replace.reservationId))
          .cleanupConductorImport(
            {
              orgId: operation.actor.orgId,
              reservationId: event.replace.reservationId,
            },
            'all',
          ),
      )
    await emit(operation, {
      kind: 'progress',
      reservation: publicImportReservation(reply.reservation),
      inFlightBytes: 0,
    })
    return reply
  }
  if (
    !('reservationId' in event) ||
    !operation.reservations.has(event.reservationId)
  )
    throw importUnavailable()
  const reservation = await readReservation(env.DB, event.reservationId)
  if (reservation?.localWorkspaceId !== action.localWorkspaceId)
    throw importUnavailable()
  const reply = await callImportService(
    env,
    operation.actor,
    event.reservationId,
    event,
  )
  if (reply.kind === 'complete')
    await emit(operation, {
      kind: 'complete',
      localWorkspaceId: action.localWorkspaceId,
      workspaceId: reply.workspaceId,
    })
  if (event.kind === 'progress' && reply.kind === 'reservation')
    await emit(operation, {
      kind: 'progress',
      reservation: publicImportReservation(reply.reservation),
      inFlightBytes: event.inFlightBytes,
    })
  return reply
}
