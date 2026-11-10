import { importEncodedBytes, importPage } from './conductor-import-pages.ts'
import {
  ImportContractError,
  importHash,
  importInteger,
  importList,
  importObject,
  importText,
} from './conductor-import-values.ts'

export interface ImportLfsObject {
  oid: string
  sizeBytes: number
}

export interface ImportLfsRequest {
  kind: 'repository.lfs'
  reservationId: string
  factsId: string
  objects: ImportLfsObject[]
}

export interface ImportLfsResult {
  kind: 'repository.lfs'
  factsId: string
  available: ImportLfsObject[]
  missing: ImportLfsObject[]
}

export function readImportLfsObject(value: unknown): ImportLfsObject {
  const object = importObject(value)
  return {
    oid: importHash(object.oid),
    sizeBytes: importInteger(object.sizeBytes),
  }
}

export function readImportLfsRequest(value: unknown): ImportLfsRequest {
  const row = importObject(value)
  if (row.kind !== 'repository.lfs') throw new ImportContractError()
  const objects = new Map<string, ImportLfsObject>()
  for (const entry of importList(row.objects)) {
    const object = readImportLfsObject(entry)
    const previous = objects.get(object.oid)
    if (previous && previous.sizeBytes !== object.sizeBytes)
      throw new ImportContractError()
    objects.set(object.oid, object)
  }
  return {
    kind: 'repository.lfs',
    reservationId: importText(row.reservationId),
    factsId: importText(row.factsId),
    objects: [...objects.values()],
  }
}

export function readImportLfsResult(value: unknown): ImportLfsResult {
  const row = importObject(value)
  if (row.kind !== 'repository.lfs') throw new ImportContractError()
  const available = importList(row.available).map(readImportLfsObject)
  const missing = importList(row.missing).map(readImportLfsObject)
  const seen = new Set<string>()
  for (const object of [...available, ...missing]) {
    if (seen.has(object.oid)) throw new ImportContractError()
    seen.add(object.oid)
  }
  return {
    kind: 'repository.lfs',
    factsId: importText(row.factsId),
    available,
    missing,
  }
}

/** Complete request and worst acknowledgement share the existing frame budget. */
export function importLfsPage(
  objects: readonly ImportLfsObject[],
  context: {
    operationId: string
    sequence: number
    reservationId: string
    factsId: string
  },
): ImportLfsObject[] {
  const { operationId, sequence, reservationId, factsId } = context
  return importPage(objects, (page) => {
    const request = {
      type: 'import.frame',
      operationId,
      sequence,
      event: {
        kind: 'repository.lfs',
        reservationId,
        factsId,
        objects: page,
      },
    }
    const reply = {
      type: 'import.ack',
      operationId,
      sequence,
      result: {
        kind: 'repository.lfs',
        factsId,
        available: page,
        missing: [],
      },
    }
    return importEncodedBytes(request) >= importEncodedBytes(reply)
      ? request
      : reply
  })
}
