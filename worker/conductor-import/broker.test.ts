import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { WorkerToDevice } from '../../src/shared/device.ts'
import { readImportWorkerFrame } from '../../src/shared/conductor-import-control-read.ts'
import type { ImportDeviceEvent } from '../../src/shared/conductor-import-operation.ts'
import { readImportPublicEvent } from '../../src/shared/conductor-import-public-read.ts'
import type { DeviceConnection } from '../devices/broker-types'
import { createHarness, type TestHarness } from '../test-support/harness'
import { ImportBroker } from './broker'
import { importFixture, type ImportFixture } from './service.test-support'
import { held } from './storage.test-support'

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

function connection() {
  const sent: WorkerToDevice[] = []
  const connection: DeviceConnection = {
    device: { deviceId: 'mac', connectionId: 'paired-connection' },
    deviceName: 'Mac',
    userId: fixture.actor.userId,
    sessionId: fixture.actor.sessionId,
    lastSeen: fixture.dependencies.now(),
    send: (message) => {
      sent.push(message)
    },
    close: () => undefined,
  }
  return { connection, sent }
}

it('awaits browser flushing before ACK and streams successive encoded scan pages without storing a scan list', async () => {
  const entered = held<void>()
  const release = held<void>()
  const mac = connection()
  const broker = new ImportBroker(
    fixture.env,
    () => mac.connection,
    fixture.dependencies.now,
    () =>
      new TransformStream<Uint8Array, Uint8Array>({
        async transform(chunk, controller) {
          entered.resolve()
          await release.promise
          controller.enqueue(chunk)
        },
      }),
  )
  const response = await broker.start(
    fixture.actor,
    mac.connection,
    { action: 'scan' },
    new AbortController().signal,
  )
  const command = readImportWorkerFrame(mac.sent[0])
  if (command.type !== 'import.operation') throw new Error('Missing operation.')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing scan stream.')
  const row = {
    ...fixture.source,
    name: '"\\\n'.repeat(50_000),
    rawHistory: 'never relay',
    sourcePath: '/private/mac/source',
  }
  const firstRead = reader.read()
  const receiving = broker.receive(mac.connection, {
    type: 'import.frame',
    operationId: command.operationId,
    sequence: 0,
    event: {
      kind: 'scan',
      rows: [
        row,
        { ...row, localWorkspaceId: 'two' },
        { ...row, localWorkspaceId: 'three' },
      ],
    },
  })
  await entered.promise
  expect(mac.sent).toEqual([command])
  release.resolve()
  const first = (await firstRead).value
  expect(first?.byteLength).toBeLessThan(1_000_000)
  const page = readImportPublicEvent(
    JSON.parse(new TextDecoder().decode(first)),
  )
  expect(page).toMatchObject({
    kind: 'scan',
    rows: [
      { state: 'available' },
      { state: 'available' },
      { state: 'available' },
    ],
  })
  expect(new TextDecoder().decode(first)).not.toContain('rawHistory')
  expect(new TextDecoder().decode(first)).not.toContain('/private/mac/source')
  await receiving
  expect(mac.sent[1]).toEqual({
    type: 'import.ack',
    operationId: command.operationId,
    sequence: 0,
    result: { kind: 'accepted' },
  })
  const send = async (sequence: number, event: ImportDeviceEvent) => {
    const reading = reader.read()
    const pending = broker.receive(mac.connection, {
      type: 'import.frame',
      operationId: command.operationId,
      sequence,
      event,
    })
    const value = (await reading).value
    await pending
    return readImportPublicEvent(JSON.parse(new TextDecoder().decode(value)))
  }
  expect(await send(1, { kind: 'scan', rows: [fixture.source] })).toMatchObject(
    { kind: 'scan', rows: [{ state: 'available' }] },
  )
  expect(await send(2, { kind: 'done' })).toEqual({ kind: 'done' })
  expect(await reader.read()).toEqual({ value: undefined, done: true })
  expect(
    await fixture.db
      .prepare('SELECT COUNT(*) AS count FROM conductor_import_reservations')
      .first('count'),
  ).toBe(0)
})

it('ends a slow private repository operation at connection replacement and sends no result to the next Mac', async () => {
  const mac = connection()
  let current: DeviceConnection | null = mac.connection
  const broker = new ImportBroker(
    fixture.env,
    () => current,
    fixture.dependencies.now,
  )
  const response = await broker.start(
    fixture.actor,
    mac.connection,
    { action: 'upload', localWorkspaceId: fixture.source.localWorkspaceId },
    new AbortController().signal,
  )
  const command = readImportWorkerFrame(mac.sent[0])
  if (command.type !== 'import.operation') throw new Error('Missing operation.')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing operation stream.')
  const progress = reader.read()
  await broker.receive(mac.connection, {
    type: 'import.frame',
    operationId: command.operationId,
    sequence: 0,
    event: { kind: 'reserve', row: fixture.source },
  })
  expect(
    readImportPublicEvent(
      JSON.parse(new TextDecoder().decode((await progress).value)),
    ),
  ).toMatchObject({ kind: 'progress' })
  const reservation = readImportWorkerFrame(mac.sent[1])
  if (
    reservation.type !== 'import.ack' ||
    reservation.result.kind !== 'reservation'
  )
    throw new Error('Missing reservation.')
  const entered = held<void>()
  const release = held<void>()
  harness.setNativeFetch(async () => {
    entered.resolve()
    await release.promise
    return Response.json({
      data: {
        repository: {
          databaseId: 17,
          nameWithOwner: 'example/repository',
          ref: null,
          defaultBranchRef: null,
        },
      },
    })
  })
  const pending = broker.receive(mac.connection, {
    type: 'import.frame',
    operationId: command.operationId,
    sequence: 1,
    event: {
      kind: 'repository.facts',
      reservationId: reservation.result.reservation.id,
    },
  })
  await entered.promise
  const failedRead = expect(reader.read()).rejects.toThrow(
    'The Mac is not available.',
  )
  current = null
  broker.closeAll()
  const next = connection()
  next.connection.device = {
    deviceId: 'another-mac',
    connectionId: 'new-connection',
  }
  current = next.connection
  release.resolve()
  await pending
  await failedRead
  expect(next.sent).toEqual([])
  expect(mac.sent.map((message) => message.type)).toEqual([
    'import.operation',
    'import.ack',
    'import.cancel',
  ])
  expect(
    await fixture.db
      .prepare('SELECT state FROM conductor_import_reservations')
      .first('state'),
  ).toBe('open')
})
