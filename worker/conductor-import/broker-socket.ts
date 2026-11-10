import type {
  ImportControlResult,
  ImportWorkerFrame,
} from '../../src/shared/conductor-import-operation.ts'
import {
  importEncodedBytes,
  importPage,
  importWire,
} from '../../src/shared/conductor-import-pages.ts'
import { DEVICE_FRAME_LIMIT_BYTES } from '../../src/shared/device.ts'
import type { DeviceConnection } from '../devices/broker-types'

export function sendImportFrame(
  connection: DeviceConnection,
  frame: ImportWorkerFrame,
) {
  importWire(frame)
  connection.send(frame)
}

export async function sendImportControl(
  connection: DeviceConnection,
  operationId: string,
  sequence: number,
  result: ImportControlResult,
  deliverPart: (
    frame: Extract<ImportWorkerFrame, { type: 'import.part' }>,
  ) => Promise<void>,
) {
  const frame = { type: 'import.ack' as const, operationId, sequence, result }
  if (importEncodedBytes(frame) < DEVICE_FRAME_LIMIT_BYTES) {
    sendImportFrame(connection, frame)
    return
  }
  if (result.kind !== 'repository.prerequisites') {
    sendImportFrame(connection, frame)
    return
  }
  const entries = [
    ...result.verified.map((value) => ({ ...value, verified: true })),
    ...result.missing.map((oid) => ({ oid, headOid: '', verified: false })),
  ]
  let page = 0
  while (entries.length) {
    const chunk = importPage(entries, (entries) => ({
      type: 'import.part',
      operationId,
      sequence,
      page,
      result: {
        kind: result.kind,
        receiptId: result.receiptId,
        verified: entries
          .filter((entry) => entry.verified)
          .map(({ oid, headOid }) => ({ oid, headOid })),
        missing: entries
          .filter((entry) => !entry.verified)
          .map(({ oid }) => oid),
      },
    }))
    await deliverPart({
      type: 'import.part',
      operationId,
      sequence,
      page,
      result: {
        kind: result.kind,
        receiptId: result.receiptId,
        verified: chunk
          .filter((entry) => entry.verified)
          .map(({ oid, headOid }) => ({ oid, headOid })),
        missing: chunk.filter((entry) => !entry.verified).map(({ oid }) => oid),
      },
    })
    entries.splice(0, chunk.length)
    page += 1
  }
  sendImportFrame(connection, {
    ...frame,
    result: {
      kind: result.kind,
      receiptId: result.receiptId,
      verified: [],
      missing: [],
    },
  })
}
