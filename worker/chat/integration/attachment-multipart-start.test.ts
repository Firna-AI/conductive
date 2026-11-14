import { expect, it } from 'vitest'

import { readAttachment } from '../attachment-data'
import {
  DRAFT_TARGET,
  multipartFixture,
  startUpload,
  WORKSPACE_TARGET,
} from './attachment-multipart.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { identifier, record } from '../inputs'

const createFixture = multipartFixture()

it('starts owned uploads for both targets with the declared size and a bounded part plan', async () => {
  const fixture = await createFixture()
  for (const [target, sizeBytes, partCount] of [
    [WORKSPACE_TARGET, 1_000_000_000, 15],
    [DRAFT_TARGET, 67_108_865, 2],
    [DRAFT_TARGET, 0, 1],
  ] as const) {
    const response = await startUpload(fixture, sizeBytes, target)
    expect(response.status).toBe(201)
    const body = record(await response.json())
    const uploadId = identifier(body.uploadId)
    expect(body).toEqual({ uploadId, partSizeBytes: 67_108_864, partCount })
    const stored = await readAttachment(fixture.env.DB, uploadId)
    expect(stored).toMatchObject({
      orgId: OUTER_ORG,
      uploaderUserId: 'owner',
      targetKind: target.type,
      targetId:
        target.type === 'workspace' ? target.workspaceId : target.messageId,
      sizeBytes,
      state: 'uploading',
    })
    expect(stored?.multipartId).toEqual(expect.any(String))
  }
})

it('rejects oversized or invalid declarations before it stores an upload', async () => {
  const fixture = await createFixture()
  const large = await startUpload(fixture, 1_000_000_001)
  expect(large.status).toBe(413)
  expect(await large.json()).toEqual({
    error: {
      code: 'attachment_too_large',
      message: 'Each file can be up to 1 GB.',
    },
  })
  for (const sizeBytes of [-1, 1.5, '6', null]) {
    const response = await startUpload(fixture, 0, WORKSPACE_TARGET, {
      sizeBytes,
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
  const draft = await startUpload(fixture, 1, DRAFT_TARGET, { messageId: '' })
  expect(draft.status).toBe(400)
  expect(
    (await fixture.env.DB.prepare('SELECT id FROM chat_attachments').all())
      .results,
  ).toEqual([])
})

it('checks the workspace target and archive before creating an upload', async () => {
  const fixture = await createFixture()
  const missing = await startUpload(fixture, 1, {
    type: 'workspace',
    workspaceId: 'missing',
  })
  expect(missing.status).toBe(404)
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const archived = await startUpload(fixture, 1)
  expect(archived.status).toBe(409)
  expect(await archived.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
  expect(
    (await fixture.env.DB.prepare('SELECT id FROM chat_attachments').all())
      .results,
  ).toEqual([])
})
