import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { WorkerToDevice } from '../../src/shared/device.ts'
import type {
  ImportDeviceEvent,
  ImportAction,
} from '../../src/shared/conductor-import-operation.ts'
import { readImportWorkerFrame } from '../../src/shared/conductor-import-control-read.ts'
import { readImportPublicEvent } from '../../src/shared/conductor-import-public-read.ts'
import { importEncodedBytes } from '../../src/shared/conductor-import-pages.ts'
import type { DeviceConnection } from '../devices/broker-types'
import { createHarness, type TestHarness } from '../test-support/harness'
import { ImportBroker } from './broker'
import { importFixture, type ImportFixture } from './service.test-support'
import {
  advertised,
  LFS_DOWNLOAD,
  LFS_OBJECTS,
  lfsResponse,
  repositoryFactsResponse,
} from './lfs.test-support'

let harness: TestHarness
let fixture: ImportFixture
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await importFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

async function operation(action: ImportAction) {
  const sent: WorkerToDevice[] = []
  const mac: DeviceConnection = {
    device: { deviceId: 'paired-mac', connectionId: 'paired-connection' },
    deviceName: 'Mac',
    userId: fixture.actor.userId,
    sessionId: fixture.actor.sessionId,
    lastSeen: fixture.dependencies.now(),
    send: (message) => {
      sent.push(message)
    },
    close: () => undefined,
  }
  const broker = new ImportBroker(
    fixture.env,
    () => mac,
    fixture.dependencies.now,
  )
  const response = await broker.start(
    fixture.actor,
    mac,
    action,
    new AbortController().signal,
  )
  const command = readImportWorkerFrame(sent[0])
  if (command.type !== 'import.operation')
    throw new Error('Missing import operation.')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing public import stream.')
  let sequence = 0
  const send = async (event: ImportDeviceEvent) => {
    const current = sequence++
    await broker.receive(mac, {
      type: 'import.frame',
      operationId: command.operationId,
      sequence: current,
      event,
    })
    const frame = readImportWorkerFrame(sent.at(-1))
    expect(frame).toMatchObject({
      type: 'import.ack',
      operationId: command.operationId,
      sequence: current,
    })
    if (frame.type !== 'import.ack') throw new Error('Missing private ACK.')
    expect(importEncodedBytes(frame)).toBeLessThan(1_000_000)
    return frame.result
  }
  return { mac, sent, broker, command, reader, send }
}

it('delivers LFS facts only to the owning Mac and sends safe progress, completion or provider failure to its page', async () => {
  let batchCalls = 0
  let unavailable = false
  harness.setNativeFetch(async (request) => {
    if (request.url === 'https://api.github.com/graphql')
      return repositoryFactsResponse()
    batchCalls += 1
    if (unavailable)
      return new Response('private-upstream-body github-test-token', {
        status: 401,
        headers: {
          Location: LFS_DOWNLOAD,
          Authorization: 'Bearer private-action-token',
        },
      })
    return lfsResponse([advertised(LFS_OBJECTS[0])], {
      privateBody: 'private-upstream-body',
    })
  })
  const active = await operation({
    action: 'upload',
    localWorkspaceId: fixture.source.localWorkspaceId,
  })
  const progress = active.reader.read()
  const reserved = await active.send({ kind: 'reserve', row: fixture.source })
  if (reserved.kind !== 'reservation') throw new Error('Missing reservation.')
  const publicProgress = readImportPublicEvent(
    JSON.parse(new TextDecoder().decode((await progress).value)),
  )
  expect(publicProgress).toEqual({
    kind: 'progress',
    inFlightBytes: 0,
    reservation: {
      id: reserved.reservation.id,
      localWorkspaceId: fixture.source.localWorkspaceId,
      createdAt: fixture.dependencies.now(),
      expiresAt: fixture.dependencies.now() + 604_800_000,
      storedBytes: 0,
      workspaceId: null,
    },
  })
  const done = active.reader.read()
  const facts = await active.send({
    kind: 'repository.facts',
    reservationId: reserved.reservation.id,
  })
  if (facts.kind !== 'repository.facts')
    throw new Error('Missing private repository facts.')
  const event = {
    kind: 'repository.lfs' as const,
    reservationId: reserved.reservation.id,
    factsId: facts.facts.id,
    objects: [LFS_OBJECTS[0]],
    url: 'https://source-controlled.example.test/lfs',
    token: 'source-controlled-token',
    path: '/private/mac/source',
  }
  const other: WorkerToDevice[] = []
  const stranger = {
    ...active.mac,
    device: { deviceId: 'another-mac', connectionId: 'another-connection' },
    send: (message: WorkerToDevice) => {
      other.push(message)
    },
  }
  await active.broker.receive(stranger, {
    type: 'import.frame',
    operationId: active.command.operationId,
    sequence: 2,
    event,
  })
  expect(other).toEqual([])
  expect(batchCalls).toBe(0)
  expect(await active.send(event)).toEqual({
    kind: 'repository.lfs',
    factsId: facts.facts.id,
    available: [{ oid: 'a'.repeat(64), sizeBytes: 123 }],
    missing: [],
  })
  expect(batchCalls).toBe(1)
  await active.send({ kind: 'done' })
  expect(
    readImportPublicEvent(
      JSON.parse(new TextDecoder().decode((await done).value)),
    ),
  ).toEqual({ kind: 'done' })
  expect(await active.reader.read()).toEqual({ done: true, value: undefined })

  unavailable = true
  const failed = await operation({
    action: 'retry',
    localWorkspaceId: fixture.source.localWorkspaceId,
    reservationId: reserved.reservation.id,
  })
  const errorRead = failed.reader.read()
  const receiving = failed.broker.receive(failed.mac, {
    type: 'import.frame',
    operationId: failed.command.operationId,
    sequence: 0,
    event,
  })
  const publicError = readImportPublicEvent(
    JSON.parse(new TextDecoder().decode((await errorRead).value)),
  )
  expect(publicError).toEqual({
    kind: 'error',
    code: 'github_unavailable',
    message: 'GitHub is not available. Try again.',
  })
  await receiving
  await expect(failed.reader.read()).rejects.toThrow(
    'The Mac is not available.',
  )
  expect(failed.sent.slice(1)).toEqual([
    {
      type: 'import.error',
      operationId: failed.command.operationId,
      sequence: 0,
      code: 'github_unavailable',
      message: 'GitHub is not available. Try again.',
    },
    { type: 'import.cancel', operationId: failed.command.operationId },
  ])
  const wire = JSON.stringify([
    publicProgress,
    publicError,
    active.sent.slice(2),
    failed.sent.slice(1),
  ])
  for (const secret of [
    LFS_DOWNLOAD,
    'private-action-token',
    'github-test-token',
    'private-upstream-body',
    'source-controlled',
    '/private/mac/source',
  ])
    expect(wire).not.toContain(secret)
  expect(
    await fixture.db
      .prepare('SELECT state FROM conductor_import_reservations')
      .first('state'),
  ).toBe('open')
})
