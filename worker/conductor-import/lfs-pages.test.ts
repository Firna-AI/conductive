import { expect, it } from 'vitest'

import { importLfsPage } from '../../src/shared/conductor-import-lfs.ts'
import { readImportDeviceFrame } from '../../src/shared/conductor-import-operation-read.ts'
import { readImportWorkerFrame } from '../../src/shared/conductor-import-control-read.ts'
import {
  importEncodedBytes,
  importWire,
} from '../../src/shared/conductor-import-pages.ts'
import { ImportContractError } from '../../src/shared/conductor-import-values.ts'
import { LFS_OBJECTS, lfsObjects } from './lfs.test-support'

it('pages complete LFS requests and worst ACKs without losing candidates at the encoded frame boundary', () => {
  const context = {
    operationId: 'operation-"\\\n☃',
    sequence: Number.MAX_SAFE_INTEGER,
    reservationId: 'reservation-"\\\n☃',
    factsId: 'facts-"\\\n☃',
  }
  const objects = lfsObjects(15_000).map((object) => ({
    ...object,
    sizeBytes: Number.MAX_SAFE_INTEGER,
  }))
  const received = []
  let offset = 0
  let pages = 0
  const request = (page: typeof objects) => ({
    type: 'import.frame',
    operationId: context.operationId,
    sequence: context.sequence,
    event: {
      kind: 'repository.lfs',
      reservationId: context.reservationId,
      factsId: context.factsId,
      objects: page,
    },
  })
  while (offset < objects.length) {
    const page = importLfsPage(objects.slice(offset), context)
    const sent = request(page)
    expect(importEncodedBytes(sent)).toBeLessThan(1_000_000)
    expect(readImportDeviceFrame(JSON.parse(importWire(sent))).event).toEqual(
      sent.event,
    )
    const reply = {
      type: 'import.ack',
      operationId: context.operationId,
      sequence: context.sequence,
      result: {
        kind: 'repository.lfs',
        factsId: context.factsId,
        available: page,
        missing: [],
      },
    }
    expect(importEncodedBytes(reply)).toBeLessThan(1_000_000)
    expect(readImportWorkerFrame(JSON.parse(importWire(reply)))).toEqual(reply)
    received.push(...page)
    offset += page.length
    if (offset < objects.length)
      expect(
        importEncodedBytes(request([...page, objects[offset]])),
      ).toBeGreaterThanOrEqual(1_000_000)
    pages += 1
  }
  expect(pages).toBeGreaterThan(1)
  expect(received).toEqual(objects)
})

it('narrows canonical LFS pairs through private frame readers and removes all other fields', () => {
  const frame = {
    type: 'import.frame',
    operationId: 'operation',
    sequence: 0,
    event: {
      kind: 'repository.lfs',
      reservationId: 'reservation',
      factsId: 'facts',
      objects: [
        { ...LFS_OBJECTS[0], path: '/private/mac/source' },
        LFS_OBJECTS[0],
      ],
      url: 'https://private.example.test',
    },
  }
  expect(readImportDeviceFrame(frame)).toEqual({
    type: 'import.frame',
    operationId: 'operation',
    sequence: 0,
    event: {
      kind: 'repository.lfs',
      reservationId: 'reservation',
      factsId: 'facts',
      objects: [LFS_OBJECTS[0]],
    },
  })
  const result = {
    kind: 'repository.lfs',
    factsId: 'facts',
    available: [LFS_OBJECTS[0]],
    missing: [LFS_OBJECTS[1]],
  }
  const reply = {
    type: 'import.ack',
    operationId: 'operation',
    sequence: 0,
    result,
  }
  expect(
    readImportWorkerFrame({
      ...reply,
      result: {
        ...result,
        token: 'private-token',
        available: [
          { ...LFS_OBJECTS[0], headers: { Authorization: 'secret' } },
        ],
      },
    }),
  ).toEqual(reply)
  for (const invalid of [
    { oid: 'A'.repeat(64), sizeBytes: 1 },
    { oid: 'a'.repeat(40), sizeBytes: 1 },
    { oid: 'a'.repeat(64), sizeBytes: -1 },
    { oid: 'a'.repeat(64), sizeBytes: 0.5 },
    { oid: 'a'.repeat(64), sizeBytes: Number.MAX_SAFE_INTEGER + 1 },
  ])
    expect(() =>
      readImportDeviceFrame({
        ...frame,
        event: { ...frame.event, objects: [invalid] },
      }),
    ).toThrow(ImportContractError)
  expect(() =>
    readImportDeviceFrame({
      ...frame,
      event: {
        ...frame.event,
        objects: [LFS_OBJECTS[0], { ...LFS_OBJECTS[0], sizeBytes: 2 }],
      },
    }),
  ).toThrow(ImportContractError)
  expect(() =>
    readImportWorkerFrame({
      ...reply,
      result: { ...result, missing: [LFS_OBJECTS[0]] },
    }),
  ).toThrow(ImportContractError)
})
