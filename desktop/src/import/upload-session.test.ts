import { expect, it, vi } from 'vitest'
import type {
  ImportDeviceFrame,
  ImportDeviceEvent,
  ImportControlResult,
  ImportScanRow,
} from '../../../src/shared/conductor-import-operation.ts'
import type { ImportUploadTarget } from '../../../src/shared/conductor-import-storage.ts'
import { uploadStageFixture } from '../../tests/import-upload.ts'
import { controllerFixture } from './controller.test-support.ts'
import type { ImportPut } from './upload.ts'
import type { ImportLfsObject } from '../../../src/shared/conductor-import-lfs.ts'

it('binds receipts to the final snapshot and follows empty missing pages before upload and verification', async () => {
  const put = vi.fn<ImportPut>().mockResolvedValue(200)
  const test = controllerFixture(put)
  test.prompt.mockResolvedValue(true)
  await test.preferences.allow()
  const { row, bytes, part, stage, manifest } = uploadStageFixture()
  const lfs: ImportLfsObject[] = [
    { oid: 'd'.repeat(64), sizeBytes: 3 },
    { oid: 'e'.repeat(64), sizeBytes: 100 },
  ]
  test.queue('exists', true)
  test.queue('row', row)
  test.queue('prepare', { id: stage.id, row })
  test.queue('lfs.page', { objects: lfs, nextCursor: null })
  test.queue('lfs.available', true)
  test.queue('build', stage)
  test.queue('seal', stage)
  test.queue('page', manifest)
  test.queue('part', bytes)
  test.queue('results', {
    files: [{ path: '.context/large.dat', sizeBytes: 104_857_601 }],
    sessions: [{ title: 'Missing native' }],
  })
  let next = test.next()
  test.controller.receive({
    type: 'import.operation',
    operationId: 'upload-one',
    orgId: 'org-one',
    operation: { action: 'upload', localWorkspaceId: 'local-one' },
  })
  const reply = async (
    kind: ImportDeviceEvent['kind'],
    result: ImportControlResult = { kind: 'accepted' },
  ): Promise<ImportDeviceFrame> => {
    const frame = await next
    expect(frame.event.kind).toBe(kind)
    next = test.next()
    test.ack(frame, result)
    return frame
  }
  await reply('reserve', {
    kind: 'reservation',
    reservation: {
      id: 'reservation-one',
      localWorkspaceId: 'local-one',
      sourceFingerprint: null,
      createdAt: 1,
      expiresAt: 1000,
      storedBytes: 0,
      workspaceId: null,
    },
  })
  await reply('repository.facts', {
    kind: 'repository.facts',
    facts: {
      id: 'facts-one',
      repositoryId: 1,
      fullName: 'firna/repository',
      branch: 'feature',
      branchHeadOid: 'b'.repeat(40),
      defaultBranch: 'main',
      defaultHeadOid: null,
      observedAt: 1,
    },
  })
  expect(
    (
      await reply('repository.lfs', {
        kind: 'repository.lfs',
        factsId: 'facts-one',
        available: [lfs[0]],
        missing: [lfs[1]],
      })
    ).event,
  ).toEqual({
    kind: 'repository.lfs',
    reservationId: 'reservation-one',
    factsId: 'facts-one',
    objects: lfs,
  })
  const proof = await reply('repository.prerequisites', {
    kind: 'repository.prerequisites',
    receiptId: 'receipt-one',
    verified: [{ oid: 'b'.repeat(40), headOid: 'b'.repeat(40) }],
    missing: [],
  })
  expect(proof.event).toMatchObject({
    sourceFingerprint: stage.snapshot.sourceFingerprint,
    headOid: stage.snapshot.headOid,
  })
  await reply('snapshot')
  await reply('manifest')
  await reply('manifest.end')
  expect(
    (await reply('missing', { kind: 'missing', parts: [], nextCursor: 1 }))
      .event,
  ).toEqual({ kind: 'missing', reservationId: 'reservation-one', cursor: 0 })
  expect(
    (
      await reply('missing', {
        kind: 'missing',
        parts: [part],
        nextCursor: null,
      })
    ).event,
  ).toEqual({ kind: 'missing', reservationId: 'reservation-one', cursor: 1 })
  const target: ImportUploadTarget = {
    method: 'PUT',
    url: 'https://private-storage.invalid/part',
    headers: { 'Content-Length': '3' },
    expiresAt: Number.MAX_SAFE_INTEGER,
    identity: {
      scope: { orgId: 'org-one', reservationId: 'reservation-one' },
      part,
      uploadId: 'upload-one',
    },
  }
  await reply('target', { kind: 'target', target: { ...target, expiresAt: 0 } })
  await reply('target', { kind: 'target', target })
  await reply('progress')
  await reply('verify', { kind: 'verified', verified: true, storedBytes: 3 })
  await reply('progress')
  await reply('complete', { kind: 'complete', workspaceId: 'workspace-one' })
  expect((await reply('result.files')).event).toEqual({
    kind: 'result.files',
    localWorkspaceId: 'local-one',
    files: [{ path: '.context/large.dat', sizeBytes: 104_857_601 }],
  })
  expect((await reply('result.sessions')).event).toEqual({
    kind: 'result.sessions',
    localWorkspaceId: 'local-one',
    sessions: [{ title: 'Missing native' }],
  })
  await reply('done')
  expect(put).toHaveBeenCalledTimes(1)
  expect([...put.mock.calls[0][1]]).toEqual([1, 2, 3])
  expect(test.calls.find((job) => job.action === 'lfs.available')).toEqual({
    action: 'lfs.available',
    stageId: 'stage-one',
    factsId: 'facts-one',
    page: 0,
    available: [lfs[0]],
  })
  expect(test.calls.find((job) => job.action === 'seal')).toEqual({
    action: 'seal',
    stageId: 'stage-one',
    prerequisites: [
      { kind: 'prerequisite', receiptId: 'receipt-one', oid: 'b'.repeat(40) },
    ],
  })
  test.controller.dispose()
})

it('atomically replaces a changed retry before preparing any new package', async () => {
  const test = controllerFixture()
  test.prompt.mockResolvedValue(true)
  await test.preferences.allow()
  const row: ImportScanRow = {
    localWorkspaceId: 'local-one',
    name: 'Changed work',
    branch: 'feature',
    repository: 'firna/repository',
    sessionCount: 0,
    uploadBytes: 0,
  }
  test.queue('exists', true)
  test.queue('row', row)
  test.queue('reuse', null)
  test.queue('row', row)
  test.queue('prepare', { id: 'new-stage', row })
  let next = test.next()
  test.controller.receive({
    type: 'import.operation',
    operationId: 'retry-one',
    orgId: 'org-one',
    operation: {
      action: 'retry',
      localWorkspaceId: 'local-one',
      reservationId: 'old-reservation',
    },
  })
  const reserve = await next
  next = test.next()
  test.ack(reserve, {
    kind: 'reservation',
    reservation: {
      id: 'old-reservation',
      localWorkspaceId: 'local-one',
      sourceFingerprint: 'a'.repeat(64),
      createdAt: 1,
      expiresAt: 1000,
      storedBytes: 20,
      workspaceId: null,
    },
  })
  const replace = await next
  expect(replace.event).toEqual({
    kind: 'reserve',
    row,
    replace: {
      reservationId: 'old-reservation',
      sourceFingerprint: 'a'.repeat(64),
    },
  })
  expect(test.calls.map((job) => job.action)).toEqual([
    'exists',
    'row',
    'reuse',
    'row',
  ])
  next = test.next()
  test.ack(replace, {
    kind: 'reservation',
    reservation: {
      id: 'new-reservation',
      localWorkspaceId: 'local-one',
      sourceFingerprint: null,
      createdAt: 2,
      expiresAt: 1001,
      storedBytes: 0,
      workspaceId: null,
    },
  })
  const facts = await next
  expect(facts.event).toEqual({
    kind: 'repository.facts',
    reservationId: 'new-reservation',
  })
  expect(test.calls.find((job) => job.action === 'prepare')).toEqual({
    action: 'prepare',
    localWorkspaceId: 'local-one',
    scope: '["user-one","org-one"]',
    reservationId: 'new-reservation',
  })
  test.controller.dispose()
})
