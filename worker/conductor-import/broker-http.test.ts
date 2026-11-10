import { afterEach, beforeEach, expect, it } from 'vitest'

import { conductorImportOperationsPath } from '../../src/shared/conductor-import.ts'
import { readImportWorkerFrame } from '../../src/shared/conductor-import-control-read.ts'
import type {
  ImportDeviceEvent,
  ImportPublicEvent,
} from '../../src/shared/conductor-import-operation.ts'
import { readImportPublicEvent } from '../../src/shared/conductor-import-public-read.ts'
import {
  deviceFixture,
  type DeviceFixture,
} from '../devices/runtime.test-support'
import { connected } from '../devices/requests.test-support'
import { ENTRIES, SNAPSHOT } from './manifest.test-support'

let fixture: DeviceFixture
beforeEach(async () => {
  fixture = await deviceFixture()
})
afterEach(async () => {
  await fixture.dispose()
})

it('binds browser imports to the exact desktop pairing and gives upload targets only to its authenticated Mac socket', async () => {
  const mac = await connected(fixture)
  const path = conductorImportOperationsPath('org')
  const action = {
    ...mac.device,
    action: 'upload',
    localWorkspaceId: 'selected',
  }
  expect(
    (
      await fixture.app(
        path,
        { ...mac.device, action: 'unknown' },
        fixture.senderToken,
        true,
      )
    ).status,
  ).toBe(400)
  expect((await fixture.app(path, action)).status).toBe(403)
  const another = await fixture.tokenFor('sender', 'another-desktop-session')
  expect((await fixture.app(path, action, another, true)).status).toBe(403)
  const response = await fixture.app(path, action, fixture.senderToken, true)
  expect(response.status).toBe(200)
  const command = readImportWorkerFrame(await mac.inbox.next())
  if (command.type !== 'import.operation')
    throw new Error('Missing import operation.')
  const pages: ImportPublicEvent[] = []
  const collecting = (async () => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Missing import response stream.')
    const decoder = new TextDecoder()
    let pending = ''
    while (true) {
      const part = await reader.read()
      if (part.done) return
      pending += decoder.decode(part.value, { stream: true })
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      pages.push(
        ...lines.map((line) => readImportPublicEvent(JSON.parse(line))),
      )
    }
  })()
  let sequence = 0
  const send = async (event: ImportDeviceEvent) => {
    const selected = sequence++
    mac.socket.send(
      JSON.stringify({
        type: 'import.frame',
        operationId: command.operationId,
        sequence: selected,
        event,
      }),
    )
    const frame = readImportWorkerFrame(await mac.inbox.next())
    expect(frame).toMatchObject({
      type: 'import.ack',
      operationId: command.operationId,
      sequence: selected,
    })
    if (frame.type !== 'import.ack')
      throw new Error('Missing private acknowledgement.')
    return frame.result
  }
  const reserved = await send({
    kind: 'reserve',
    row: {
      localWorkspaceId: 'selected',
      name: 'Transferred',
      repository: 'owner/repo',
      branch: 'work',
      sessionCount: 1,
      uploadBytes: 29,
    },
  })
  if (reserved.kind !== 'reservation') throw new Error('Missing reservation.')
  const reservationId = reserved.reservation.id
  await send({
    kind: 'snapshot',
    reservationId,
    snapshot: {
      ...SNAPSHOT,
      localWorkspaceId: 'selected',
      repository: 'owner/repo',
      branch: 'work',
    },
  })
  await send({ kind: 'manifest', reservationId, offset: 0, entries: ENTRIES })
  await send({ kind: 'manifest.end', reservationId })
  const target = await send({ kind: 'target', reservationId, partId: 'bundle' })
  expect(target).toMatchObject({ kind: 'target', target: { method: 'PUT' } })
  if (target.kind !== 'target') throw new Error('Missing upload target.')
  expect(new URL(target.target.url).protocol).toBe('https:')
  await send({
    kind: 'result.files',
    localWorkspaceId: 'selected',
    files: [{ path: '.context/large.dat', sizeBytes: 104_857_601 }],
  })
  await send({
    kind: 'result.sessions',
    localWorkspaceId: 'selected',
    sessions: [{ title: 'Missing memory' }],
  })
  await send({ kind: 'done' })
  await collecting
  expect(pages.map((page) => page.kind)).toEqual([
    'progress',
    'result.files',
    'result.sessions',
    'done',
  ])
  expect(JSON.stringify(pages)).not.toContain(target.target.url)
  expect(JSON.stringify(pages)).not.toContain('X-Amz')
  expect(JSON.stringify(pages)).not.toContain('sourceFingerprint')
  expect(JSON.stringify(pages)).not.toContain('native-test-id')
  mac.socket.send(JSON.stringify({ type: 'device.ping' }))
  expect(await mac.inbox.next()).toEqual({ type: 'device.pong' })
  expect(
    await fixture.db
      .prepare(
        'SELECT COUNT(*) AS count FROM workspaces WHERE conductor_local_id IS NOT NULL',
      )
      .first('count'),
  ).toBe(0)
})
