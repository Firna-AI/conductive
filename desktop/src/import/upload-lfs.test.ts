import { expect, it } from 'vitest'
import { uploadStageFixture } from '../../tests/import-upload.ts'
import { controllerFixture } from './controller.test-support.ts'

it('rejects availability for an unrequested LFS object before recording an omission', async () => {
  const test = controllerFixture()
  test.prompt.mockResolvedValue(true)
  await test.preferences.allow()
  const { row } = uploadStageFixture()
  test.queue('exists', true)
  test.queue('row', row)
  test.queue('prepare', { id: 'stage-one', row })
  test.queue('lfs.page', {
    objects: [{ oid: 'd'.repeat(64), sizeBytes: 3 }],
    nextCursor: null,
  })
  let next = test.next()
  test.controller.receive({
    type: 'import.operation',
    operationId: 'upload-one',
    orgId: 'org-one',
    operation: { action: 'upload', localWorkspaceId: row.localWorkspaceId },
  })
  const reserve = await next
  next = test.next()
  test.ack(reserve, {
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
  const facts = await next
  next = test.next()
  test.ack(facts, {
    kind: 'repository.facts',
    facts: {
      id: 'facts-one',
      repositoryId: 1,
      fullName: 'firna/repository',
      branch: 'feature',
      branchHeadOid: null,
      defaultBranch: 'main',
      defaultHeadOid: null,
      observedAt: 1,
    },
  })
  const request = await next
  expect(request.event).toEqual({
    kind: 'repository.lfs',
    reservationId: 'reservation-one',
    factsId: 'facts-one',
    objects: [{ oid: 'd'.repeat(64), sizeBytes: 3 }],
  })
  next = test.next()
  test.ack(request, {
    kind: 'repository.lfs',
    factsId: 'facts-one',
    available: [{ oid: 'e'.repeat(64), sizeBytes: 3 }],
    missing: [],
  })
  const failed = await next
  expect(failed.event).toEqual({ kind: 'failed', code: 'upload_failed' })
  expect(test.calls.map((job) => job.action)).toEqual([
    'exists',
    'row',
    'prepare',
    'lfs.page',
  ])
  test.ack(failed)
  test.controller.dispose()
})
