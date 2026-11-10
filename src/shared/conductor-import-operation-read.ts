import type {
  ImportAction,
  ImportDeviceEvent,
  ImportDeviceFrame,
  ImportScanRow,
} from './conductor-import-operation.ts'
import {
  readImportManifestEntry,
  readImportSnapshot,
} from './conductor-import-manifest-read.ts'
import {
  ImportContractError,
  importBranch,
  importHash,
  importInteger,
  importList,
  importNullableText,
  importObject,
  importOid,
  importPath,
  importRepositoryName,
  importText,
} from './conductor-import-values.ts'

export function readImportAction(value: unknown): ImportAction {
  const row = importObject(value)
  if (
    row.action === 'status' ||
    row.action === 'dismiss' ||
    row.action === 'scan'
  )
    return { action: row.action }
  if (row.action === 'upload')
    return {
      action: row.action,
      localWorkspaceId: importText(row.localWorkspaceId),
    }
  if (row.action === 'retry')
    return {
      action: row.action,
      localWorkspaceId: importText(row.localWorkspaceId),
      reservationId: importText(row.reservationId),
    }
  throw new ImportContractError()
}

export function readImportScanRow(value: unknown): ImportScanRow {
  const row = importObject(value)
  return {
    localWorkspaceId: importText(row.localWorkspaceId),
    name: importText(row.name),
    repository:
      row.repository === null ? null : publicRepository(row.repository),
    branch: row.branch === null ? null : importBranch(row.branch),
    sessionCount:
      row.sessionCount === null ? null : importInteger(row.sessionCount),
    uploadBytes:
      row.uploadBytes === null ? null : importInteger(row.uploadBytes),
  }
}

function publicRepository(value: unknown): string | null {
  try {
    return importRepositoryName(value)
  } catch {
    return null
  }
}

export function readImportDeviceFrame(value: unknown): ImportDeviceFrame {
  const row = importObject(value)
  if (row.type !== 'import.frame') throw new ImportContractError()
  return {
    type: 'import.frame',
    operationId: importText(row.operationId),
    sequence: importInteger(row.sequence),
    event: readImportDeviceEvent(row.event),
  }
}

export function readImportDeviceEvent(value: unknown): ImportDeviceEvent {
  const row = importObject(value)
  if (row.kind === 'done') return { kind: 'done' }
  if (row.kind === 'failed') {
    const code = row.code
    if (
      code !== 'consent_required' &&
      code !== 'source_missing' &&
      code !== 'source_changed' &&
      code !== 'read_failed' &&
      code !== 'upload_failed'
    )
      throw new ImportContractError()
    return { kind: row.kind, code }
  }
  if (row.kind === 'status') {
    if (
      typeof row.available !== 'boolean' ||
      typeof row.dismissed !== 'boolean' ||
      (row.consent !== 'unknown' &&
        row.consent !== 'allowed' &&
        row.consent !== 'denied')
    )
      throw new ImportContractError()
    return {
      kind: row.kind,
      available: row.available,
      dismissed: row.dismissed,
      consent: row.consent,
    }
  }
  if (row.kind === 'scan')
    return { kind: row.kind, rows: importList(row.rows).map(readImportScanRow) }
  if (row.kind === 'reserve') {
    const replace =
      row.replace === undefined ? undefined : importObject(row.replace)
    return {
      kind: row.kind,
      row: readImportScanRow(row.row),
      ...(replace && {
        replace: {
          reservationId: importText(replace.reservationId),
          sourceFingerprint:
            replace.sourceFingerprint === null
              ? null
              : importHash(replace.sourceFingerprint),
        },
      }),
    }
  }
  if (row.kind === 'result.files')
    return {
      kind: row.kind,
      localWorkspaceId: importText(row.localWorkspaceId),
      files: importList(row.files).map((value) => {
        const file = importObject(value)
        return {
          path: importPath(file.path),
          sizeBytes: importInteger(file.sizeBytes),
        }
      }),
    }
  if (row.kind === 'result.sessions')
    return {
      kind: row.kind,
      localWorkspaceId: importText(row.localWorkspaceId),
      sessions: importList(row.sessions).map((value) => ({
        title: importNullableText(importObject(value).title),
      })),
    }
  const reservationId = importText(row.reservationId)
  if (row.kind === 'snapshot')
    return {
      kind: row.kind,
      reservationId,
      snapshot: readImportSnapshot(row.snapshot),
    }
  if (row.kind === 'manifest')
    return {
      kind: row.kind,
      reservationId,
      offset: importInteger(row.offset),
      entries: importList(row.entries).map(readImportManifestEntry),
    }
  if (row.kind === 'target' || row.kind === 'verify')
    return { kind: row.kind, reservationId, partId: importText(row.partId) }
  if (
    row.kind === 'manifest.end' ||
    row.kind === 'complete' ||
    row.kind === 'repository.facts'
  )
    return { kind: row.kind, reservationId }
  if (row.kind === 'missing')
    return { kind: row.kind, reservationId, cursor: importInteger(row.cursor) }
  if (row.kind === 'progress')
    return {
      kind: row.kind,
      reservationId,
      inFlightBytes: importInteger(row.inFlightBytes),
    }
  if (row.kind === 'repository.prerequisites')
    return {
      kind: row.kind,
      reservationId,
      factsId: importText(row.factsId),
      sourceFingerprint: importHash(row.sourceFingerprint),
      headOid: importOid(row.headOid),
      candidates: importList(row.candidates).map(importOid),
    }
  throw new ImportContractError()
}
