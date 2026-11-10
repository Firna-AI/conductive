import { expect, it } from 'vitest'
import { uploadStageFixture } from '../../tests/import-upload.ts'
import { controllerFixture } from './controller.test-support.ts'

it('rejects a name change after reservation before publishing a snapshot', async () => {
  const test = controllerFixture()
  test.prompt.mockResolvedValue(true)
  await test.preferences.allow()
  const { row } = uploadStageFixture()
  test.queue('exists', true)
  test.queue('row', row)
  test.queue('prepare', {
    id: 'stage-one',
    row: { ...row, name: 'Changed name' },
  })
  let next = test.next()
  test.controller.receive({
    type: 'import.operation',
    operationId: 'upload-one',
    orgId: 'org-one',
    operation: { action: 'upload', localWorkspaceId: row.localWorkspaceId },
  })
  const reserve = await next
  expect(reserve.event).toEqual({ kind: 'reserve', row })
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
  const failed = await next
  expect(failed.event).toEqual({ kind: 'failed', code: 'source_changed' })
  expect(test.calls.map((job) => job.action)).toEqual([
    'exists',
    'row',
    'prepare',
  ])
  test.ack(failed)
  test.controller.dispose()
})
