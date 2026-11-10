import type {
  ImportControlResult,
  ImportReservation,
  ImportWorkerFrame,
} from './conductor-import-operation.ts'
import { readImportLfsResult } from './conductor-import-lfs.ts'
import type { ImportUploadTarget } from './conductor-import-storage.ts'
import { readImportAction } from './conductor-import-operation-read.ts'
import { readImportPart } from './conductor-import-manifest-read.ts'
import {
  ImportContractError,
  importInteger,
  importList,
  importNullableText,
  importObject,
  importOid,
  importText,
} from './conductor-import-values.ts'

function readImportReservation(value: unknown): ImportReservation {
  const row = importObject(value)
  return {
    id: importText(row.id),
    localWorkspaceId: importText(row.localWorkspaceId),
    sourceFingerprint: importNullableText(row.sourceFingerprint),
    createdAt: importInteger(row.createdAt),
    expiresAt: importInteger(row.expiresAt),
    storedBytes: importInteger(row.storedBytes),
    workspaceId: importNullableText(row.workspaceId),
  }
}

function readTarget(value: unknown): ImportUploadTarget {
  const row = importObject(value)
  if (row.method !== 'PUT') throw new ImportContractError()
  const url = importText(row.url)
  const parsed = new URL(url)
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  )
    throw new ImportContractError()
  const identity = importObject(row.identity)
  const scope = importObject(identity.scope)
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(importObject(row.headers)))
    headers[key] = importText(value)
  return {
    method: 'PUT',
    url,
    headers,
    expiresAt: importInteger(row.expiresAt),
    identity: {
      scope: {
        orgId: importText(scope.orgId),
        reservationId: importText(scope.reservationId),
      },
      part: readImportPart(identity.part),
      uploadId: importText(identity.uploadId),
    },
  }
}

function readImportControlResult(value: unknown): ImportControlResult {
  const row = importObject(value)
  if (row.kind === 'repository.lfs') return readImportLfsResult(row)
  if (row.kind === 'accepted') return { kind: row.kind }
  if (row.kind === 'complete')
    return { kind: row.kind, workspaceId: importText(row.workspaceId) }
  if (row.kind === 'reservation')
    return {
      kind: row.kind,
      reservation: readImportReservation(row.reservation),
    }
  if (row.kind === 'target')
    return { kind: row.kind, target: readTarget(row.target) }
  if (row.kind === 'missing')
    return {
      kind: row.kind,
      parts: importList(row.parts).map(readImportPart),
      nextCursor:
        row.nextCursor === null ? null : importInteger(row.nextCursor),
    }
  if (row.kind === 'verified') {
    if (typeof row.verified !== 'boolean') throw new ImportContractError()
    return {
      kind: row.kind,
      verified: row.verified,
      storedBytes: importInteger(row.storedBytes),
    }
  }
  if (row.kind === 'repository.facts') {
    const facts = importObject(row.facts)
    if (typeof facts.defaultBranch !== 'string') throw new ImportContractError()
    return {
      kind: row.kind,
      facts: {
        id: importText(facts.id),
        repositoryId: importInteger(facts.repositoryId),
        fullName: importText(facts.fullName),
        branch: importText(facts.branch),
        branchHeadOid:
          facts.branchHeadOid === null ? null : importOid(facts.branchHeadOid),
        defaultBranch: facts.defaultBranch,
        defaultHeadOid:
          facts.defaultHeadOid === null
            ? null
            : importOid(facts.defaultHeadOid),
        observedAt: importInteger(facts.observedAt),
      },
    }
  }
  if (row.kind === 'repository.prerequisites')
    return {
      kind: row.kind,
      receiptId: importText(row.receiptId),
      verified: importList(row.verified).map((value) => {
        const entry = importObject(value)
        return { oid: importOid(entry.oid), headOid: importOid(entry.headOid) }
      }),
      missing: importList(row.missing).map(importOid),
    }
  throw new ImportContractError()
}

/** The desktop main process is the only consumer of private upload targets. */
export function readImportWorkerFrame(value: unknown): ImportWorkerFrame {
  const row = importObject(value)
  const operationId = importText(row.operationId)
  if (row.type === 'import.operation')
    return {
      type: row.type,
      operationId,
      orgId: importText(row.orgId),
      operation: readImportAction(row.operation),
    }
  if (row.type === 'import.cancel') return { type: row.type, operationId }
  const sequence = importInteger(row.sequence)
  if (row.type === 'import.part') {
    const result = readImportControlResult(row.result)
    if (result.kind !== 'repository.prerequisites')
      throw new ImportContractError()
    return {
      type: row.type,
      operationId,
      sequence,
      page: importInteger(row.page),
      result,
    }
  }
  if (row.type === 'import.ack')
    return {
      type: row.type,
      operationId,
      sequence,
      result: readImportControlResult(row.result),
    }
  if (row.type === 'import.error')
    return {
      type: row.type,
      operationId,
      sequence,
      code: importText(row.code),
      message: importText(row.message),
    }
  throw new ImportContractError()
}
