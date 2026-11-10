import type {
  ImportAction,
  ImportPublicEvent,
  ImportRowState,
  ImportScanRow,
} from '../../shared/conductor-import-operation'
import type { DevicePairing } from '../../shared/device'
import type { ImportOperationEnd } from './import-operation'

/** A row of the scan, with its state in the org. */
export type ImportRow = ImportScanRow & ImportRowState

/** The upload of one workspace of the import. */
export interface UploadItem {
  row: ImportRow
  /** Waiting for its turn, going up, ended, or stopped with a failure. */
  state: 'waiting' | 'uploading' | 'ended' | 'failed'
  /** The bytes that the server verified, from the last progress. */
  storedBytes: number
  /** The bytes on their way, which the server did not verify yet. */
  inFlightBytes: number
  /** The reservation of the upload, which Try again names. */
  reservationId: string | null
  /** The workspace that the import made, from `complete`. */
  workspaceId: string | null
  /** The files that stayed on the Mac. */
  files: readonly { path: string; sizeBytes: number }[]
  /** The sessions that did not import. */
  sessions: readonly { title: string | null }[]
  /** Why the upload stopped, while it is failed. */
  failure: string | null
}

/** The words of a failure that the Mac names for an upload. */
const failures: Readonly<
  Record<Extract<ImportOperationEnd, { kind: 'failed' }>['code'], string>
> = {
  consent_required: 'Allow access to your Conductor data, then try again.',
  source_missing: 'This workspace is no longer in Conductor on this Mac.',
  source_changed: 'This workspace changed in Conductor. Try again.',
  read_failed: "This Mac couldn't read the workspace. Try again.",
  upload_failed: 'The upload stopped. Try again sends only what is missing.',
}

/** The words of how an operation ended, or null when it ended well. */
export function endMessage(end: ImportOperationEnd): string | null {
  switch (end.kind) {
    case 'done':
      return null
    case 'failed':
      return failures[end.code]
    case 'error':
      return end.message
    case 'aborted':
      return 'The import stopped. Try again.'
  }
}

/** A new upload for a row, before its turn. */
export function uploadOf(row: ImportRow): UploadItem {
  return {
    row,
    state: 'waiting',
    storedBytes: row.state === 'unfinished' ? row.storedBytes : 0,
    inFlightBytes: 0,
    reservationId: row.state === 'unfinished' ? row.reservationId : null,
    workspaceId: null,
    files: [],
    sessions: [],
    failure: null,
  }
}

/**
 * The action of an upload: Try again of its reservation, from the parts
 * that the server keeps, or a new upload.
 */
export function actionOf(item: UploadItem): ImportAction {
  const { localWorkspaceId } = item.row
  return item.reservationId
    ? { action: 'retry', localWorkspaceId, reservationId: item.reservationId }
    : { action: 'upload', localWorkspaceId }
}

/**
 * The upload after one event of its operation. `complete` names the
 * workspace, and the result pages that follow it name what stayed on the
 * Mac and the sessions that did not import. Progress gives the verified
 * bytes apart from the bytes on their way.
 */
export function withEvent(
  item: UploadItem,
  event: ImportPublicEvent,
): UploadItem {
  switch (event.kind) {
    case 'progress':
      return {
        ...item,
        storedBytes: event.reservation.storedBytes,
        inFlightBytes: event.inFlightBytes,
        reservationId: event.reservation.id,
      }
    case 'complete':
      return { ...item, workspaceId: event.workspaceId, inFlightBytes: 0 }
    case 'result.files':
      return { ...item, files: [...item.files, ...event.files] }
    case 'result.sessions':
      return { ...item, sessions: [...item.sessions, ...event.sessions] }
    default:
      return item
  }
}

/**
 * The upload after the end of its operation. Only `done` after `complete`
 * ends it well. A `done` with no workspace means that the import made none.
 */
export function withEnd(item: UploadItem, end: ImportOperationEnd): UploadItem {
  const failure =
    endMessage(end) ??
    (item.workspaceId === null
      ? 'The workspace was not imported. Try again.'
      : null)
  return failure === null
    ? { ...item, state: 'ended', inFlightBytes: 0, failure: null }
    : { ...item, state: 'failed', inFlightBytes: 0, failure }
}

/** The pairing that an operation names, with its action. */
export function requestOf(pairing: DevicePairing, action: ImportAction) {
  return { ...pairing, ...action }
}
