import { expect, it } from 'vitest'
import type { DeviceToWorker } from '../../../src/shared/device.ts'
import { createImportChannel } from './channel.ts'

it('assembles ordered private proof pages and ignores stale acknowledgments', async () => {
  const sent: DeviceToWorker[] = []
  const abort = new AbortController()
  const channel = createImportChannel(
    'operation-one',
    (message) => {
      sent.push(message)
      return true
    },
    abort,
  )
  const result = channel.exchange({
    kind: 'repository.prerequisites',
    reservationId: 'reservation-one',
    factsId: 'facts-one',
    sourceFingerprint: 'a'.repeat(64),
    headOid: 'b'.repeat(40),
    candidates: ['c'.repeat(40)],
  })
  channel.receive({
    type: 'import.ack',
    operationId: 'older-operation',
    sequence: 0,
    result: { kind: 'accepted' },
  })
  channel.receive({
    type: 'import.ack',
    operationId: 'operation-one',
    sequence: 1,
    result: { kind: 'accepted' },
  })
  channel.receive({
    type: 'import.part',
    operationId: 'operation-one',
    sequence: 0,
    page: 1,
    result: {
      kind: 'repository.prerequisites',
      receiptId: 'receipt-one',
      verified: [],
      missing: [],
    },
  })
  expect(sent.map((message) => message.type)).toEqual(['import.frame'])
  channel.receive({
    type: 'import.part',
    operationId: 'operation-one',
    sequence: 0,
    page: 0,
    result: {
      kind: 'repository.prerequisites',
      receiptId: 'receipt-one',
      verified: [{ oid: 'c'.repeat(40), headOid: 'd'.repeat(40) }],
      missing: [],
    },
  })
  channel.receive({
    type: 'import.part',
    operationId: 'operation-one',
    sequence: 0,
    page: 1,
    result: {
      kind: 'repository.prerequisites',
      receiptId: 'receipt-one',
      verified: [],
      missing: ['e'.repeat(40)],
    },
  })
  expect(sent.slice(1)).toEqual([
    {
      type: 'import.part.ack',
      operationId: 'operation-one',
      sequence: 0,
      page: 0,
    },
    {
      type: 'import.part.ack',
      operationId: 'operation-one',
      sequence: 0,
      page: 1,
    },
  ])
  channel.receive({
    type: 'import.ack',
    operationId: 'operation-one',
    sequence: 0,
    result: {
      kind: 'repository.prerequisites',
      receiptId: 'receipt-one',
      verified: [],
      missing: [],
    },
  })
  expect(await result).toEqual({
    kind: 'repository.prerequisites',
    receiptId: 'receipt-one',
    verified: [{ oid: 'c'.repeat(40), headOid: 'd'.repeat(40) }],
    missing: ['e'.repeat(40)],
  })
  const next = channel.exchange({ kind: 'done' })
  expect(sent.at(-1)).toEqual({
    type: 'import.frame',
    operationId: 'operation-one',
    sequence: 1,
    event: { kind: 'done' },
  })
  channel.receive({ type: 'import.cancel', operationId: 'operation-one' })
  await expect(next).rejects.toMatchObject({ code: 'upload_failed' })
  expect(abort.signal.aborted).toBe(true)
  const overflow = createImportChannel(
    'overflow',
    () => false,
    new AbortController(),
  )
  await expect(overflow.exchange({ kind: 'done' })).rejects.toMatchObject({
    code: 'upload_failed',
  })
})
