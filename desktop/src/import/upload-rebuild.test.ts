import { expect, it } from 'vitest'
import type {
  ImportControlResult,
  ImportDeviceEvent,
  ImportDeviceFrame,
} from '../../../src/shared/conductor-import-operation.ts'
import { uploadStageFixture } from '../../tests/import-upload.ts'
import { controllerFixture } from './controller.test-support.ts'

it('retains a proved common root and obtains a fresh receipt after the bundle changes', async () => {
  const test = controllerFixture()
  test.prompt.mockResolvedValue(true)
  await test.preferences.allow()
  const { row, stage } = uploadStageFixture()
  const provisional = {
    ...stage,
    candidates: [stage.headOid, ...stage.candidates],
    snapshot: {
      ...stage.snapshot,
      sourceFingerprint: 'd'.repeat(64),
      bundleObjectId: null,
      recordCount: 2,
      objectCount: 0,
      partCount: 0,
      storedBytes: 0,
      restoredBytes: 0,
      gitDisk: {
        ...stage.snapshot.gitDisk,
        reconstruction: { objectCount: 0, inflatedBytes: 0, maxObjectBytes: 0 },
      },
    },
  }
  test.queue('exists', true)
  test.queue('row', row)
  test.queue('prepare', { id: stage.id, row })
  test.queue('lfs.page', { objects: [], nextCursor: null })
  test.queue('build', provisional)
  test.queue('build', stage)
  test.queue('seal', stage)
  let next = test.next()
  test.controller.receive({
    type: 'import.operation',
    operationId: 'retry-proof',
    orgId: 'org-one',
    operation: { action: 'upload', localWorkspaceId: row.localWorkspaceId },
  })
  const reply = async (
    kind: ImportDeviceEvent['kind'],
    result: ImportControlResult,
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
      localWorkspaceId: row.localWorkspaceId,
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
      branchHeadOid: null,
      defaultBranch: 'main',
      defaultHeadOid: 'f'.repeat(40),
      observedAt: 1,
    },
  })
  const originalProof = await reply('repository.prerequisites', {
    kind: 'repository.prerequisites',
    receiptId: 'old-receipt',
    verified: [{ oid: 'b'.repeat(40), headOid: 'f'.repeat(40) }],
    missing: [stage.headOid],
  })
  expect(originalProof.event).toMatchObject({
    sourceFingerprint: provisional.snapshot.sourceFingerprint,
    candidates: [stage.headOid, 'b'.repeat(40)],
  })
  const finalProof = await reply('repository.prerequisites', {
    kind: 'repository.prerequisites',
    receiptId: 'final-receipt',
    verified: [{ oid: 'b'.repeat(40), headOid: 'f'.repeat(40) }],
    missing: [],
  })
  expect(finalProof.event).toMatchObject({
    sourceFingerprint: stage.snapshot.sourceFingerprint,
    candidates: ['b'.repeat(40)],
  })
  const snapshot = await next
  expect(snapshot.event).toEqual({
    kind: 'snapshot',
    reservationId: 'reservation-one',
    snapshot: stage.snapshot,
  })
  expect(
    test.calls
      .filter((job) => job.action === 'build')
      .map((job) => job.exclusions),
  ).toEqual([undefined, ['b'.repeat(40)]])
  expect(test.calls.find((job) => job.action === 'seal')).toEqual({
    action: 'seal',
    stageId: stage.id,
    prerequisites: [
      { kind: 'prerequisite', oid: 'b'.repeat(40), receiptId: 'final-receipt' },
    ],
  })
  test.controller.dispose()
})
