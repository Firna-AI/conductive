import { expect, it } from 'vitest'

import { attachmentPath } from '../../../src/shared/attachment-paths'
import { readAttachment } from '../attachment-data'
import { attachmentBucket } from '../attachment-record'
import {
  completeUpload,
  DRAFT_TARGET,
  multipartFixture,
  partReceipt,
  sendPart,
  startedUpload,
  uploadRecord,
} from './attachment-multipart.test-support'
import { OUTER_WORKSPACE } from './outer-seed.test-support'

const createFixture = multipartFixture()

it('streams two native R2 parts and publishes the exact file and its copy path', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 67_108_867)
  const first = await sendPart(
    fixture,
    uploadId,
    1,
    new Uint8Array(67_108_864).fill(128),
  )
  expect(first.status).toBe(200)
  const tail = new Uint8Array([0, 255, 65])
  const last = await sendPart(fixture, uploadId, 2, tail)
  expect(last.status).toBe(200)
  const parts = [await partReceipt(last), await partReceipt(first)]
  const response = await completeUpload(fixture, uploadId, parts)
  expect(response.status).toBe(201)
  const stored = await uploadRecord(fixture, uploadId)
  expect(await response.json()).toEqual({
    attachment: {
      id: uploadId,
      name: 'multipart file.bin',
      kind: 'file',
      mediaType: 'application/octet-stream',
      sizeBytes: 67_108_867,
      path: await attachmentPath(stored),
    },
  })
  expect(stored).toMatchObject({
    state: 'ready',
    multipartId: null,
    sizeBytes: 67_108_867,
  })
  const object = await attachmentBucket(fixture.env).get(stored.objectKey)
  if (!object) throw new Error('The object is missing.')
  const reader: ReadableStreamDefaultReader<Uint8Array> =
    object.body.getReader()
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const headLength = Math.max(
      0,
      Math.min(value.byteLength, 67_108_864 - size),
    )
    expect(value.subarray(0, headLength).every((byte) => byte === 128)).toBe(
      true,
    )
    expect(value.subarray(headLength)).toEqual(
      tail.subarray(
        Math.max(0, size - 67_108_864),
        Math.max(0, size + value.byteLength - 67_108_864),
      ),
    )
    size += value.byteLength
  }
  expect(size).toBe(67_108_867)
})

it('accepts one empty part for a zero-byte draft file', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 0, DRAFT_TARGET)
  const response = await sendPart(fixture, uploadId, 1, new Uint8Array(), {
    target: DRAFT_TARGET,
  })
  expect(response.status).toBe(200)
  const receipt = await partReceipt(response)
  const interrupted = await sendPart(fixture, uploadId, 1, new Uint8Array(), {
    target: DRAFT_TARGET,
    query: '?fixtureBody=short',
  })
  expect(interrupted.status).toBe(400)
  const complete = await completeUpload(
    fixture,
    uploadId,
    [receipt],
    DRAFT_TARGET,
  )
  expect(complete.status).toBe(201)
  expect(await complete.json()).toMatchObject({ attachment: { sizeBytes: 0 } })
  const stored = await uploadRecord(fixture, uploadId)
  const object = await attachmentBucket(fixture.env).get(stored.objectKey)
  if (!object) throw new Error('The object is missing.')
  expect(new Uint8Array(await object.arrayBuffer())).toEqual(new Uint8Array())
})

it('deletes a completed object when its stored size differs from the declared size', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 6)
  const stored = await uploadRecord(fixture, uploadId)
  if (!stored.multipartId) throw new Error('The multipart ID is missing.')
  const bucket = attachmentBucket(fixture.env)
  const part = await bucket
    .resumeMultipartUpload(stored.objectKey, stored.multipartId)
    .uploadPart(1, new Uint8Array([1, 2, 3]))
  const response = await completeUpload(fixture, uploadId, [part])
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    error: { code: 'attachment_size_mismatch' },
  })
  expect(await readAttachment(fixture.env.DB, uploadId)).toBeNull()
  expect(await bucket.get(stored.objectKey)).toBeNull()
})

it('validates the complete receipt set before it ends the upload', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 1)
  const response = await sendPart(fixture, uploadId, 1, new Uint8Array([7]))
  expect(response.status).toBe(200)
  const receipt = await partReceipt(response)
  for (const parts of [
    [],
    [receipt, receipt],
    [{ ...receipt, partNumber: 2 }],
    [{ ...receipt, etag: '' }],
  ]) {
    const rejected = await completeUpload(fixture, uploadId, parts)
    expect(rejected.status).toBe(400)
    expect(await rejected.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
  expect((await completeUpload(fixture, uploadId, [receipt])).status).toBe(201)
})

it('refuses a target archived after start and cleanup aborts the unpublished upload', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 1)
  const part = await sendPart(fixture, uploadId, 1, new Uint8Array([7]))
  expect(part.status).toBe(200)
  const receipt = await partReceipt(part)
  const stored = await uploadRecord(fixture, uploadId)
  await fixture.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  expect((await completeUpload(fixture, uploadId, [receipt])).status).toBe(409)
  const untouchedId = await startedUpload(fixture, 1, DRAFT_TARGET)
  const untouched = await uploadRecord(fixture, untouchedId)
  await fixture.env.DB.prepare(
    'UPDATE chat_attachments SET expires_at = 0 WHERE id IN (?, ?)',
  )
    .bind(uploadId, untouchedId)
    .run()
  const cleanup = await fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}/__test/scheduled`,
  )
  expect(cleanup.status).toBe(200)
  for (const upload of [stored, untouched]) {
    expect(await readAttachment(fixture.env.DB, upload.id)).toBeNull()
    if (!upload.multipartId) throw new Error('The multipart ID is missing.')
    await expect(
      attachmentBucket(fixture.env)
        .resumeMultipartUpload(upload.objectKey, upload.multipartId)
        .uploadPart(1, new Uint8Array([1])),
    ).rejects.toThrow(/(?:10024|NoSuchUpload|does not exist)/i)
    expect(await attachmentBucket(fixture.env).get(upload.objectKey)).toBeNull()
  }
})
