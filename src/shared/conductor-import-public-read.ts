import type {
  ImportPublicEvent,
  ImportRowState,
} from './conductor-import-operation.ts'
import {
  readImportDeviceEvent,
  readImportScanRow,
} from './conductor-import-operation-read.ts'
import {
  ImportContractError,
  importInteger,
  importList,
  importObject,
  importText,
} from './conductor-import-values.ts'

function state(value: unknown): ImportRowState {
  const row = importObject(value)
  if (row.state === 'available' || row.state === 'unavailable')
    return { state: row.state }
  if (row.state === 'imported')
    return { state: row.state, workspaceId: importText(row.workspaceId) }
  if (row.state === 'unfinished')
    return {
      state: row.state,
      reservationId:
        row.reservationId === null ? null : importText(row.reservationId),
      storedBytes: importInteger(row.storedBytes),
      expiresAt: importInteger(row.expiresAt),
    }
  throw new ImportContractError()
}

/** Renderer readers accept only public progress, results, and scan metadata. */
export function readImportPublicEvent(value: unknown): ImportPublicEvent {
  const row = importObject(value)
  if (row.kind === 'scan')
    return {
      kind: row.kind,
      rows: importList(row.rows).map((value) => ({
        ...readImportScanRow(value),
        ...state(value),
      })),
    }
  if (row.kind === 'progress') {
    const saved = importObject(row.reservation)
    return {
      kind: row.kind,
      reservation: {
        id: importText(saved.id),
        localWorkspaceId: importText(saved.localWorkspaceId),
        createdAt: importInteger(saved.createdAt),
        expiresAt: importInteger(saved.expiresAt),
        storedBytes: importInteger(saved.storedBytes),
        workspaceId:
          saved.workspaceId === null ? null : importText(saved.workspaceId),
      },
      inFlightBytes: importInteger(row.inFlightBytes),
    }
  }
  if (row.kind === 'complete')
    return {
      kind: row.kind,
      workspaceId: importText(row.workspaceId),
      localWorkspaceId: importText(row.localWorkspaceId),
    }
  if (row.kind === 'error')
    return {
      kind: row.kind,
      code: importText(row.code),
      message: importText(row.message),
    }
  const event = readImportDeviceEvent(value)
  if (
    event.kind === 'status' ||
    event.kind === 'result.files' ||
    event.kind === 'result.sessions' ||
    event.kind === 'done' ||
    event.kind === 'failed'
  )
    return event
  throw new ImportContractError()
}
