import { expect, it } from 'vitest'

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
import { OTHER_WORKSPACE } from './outer-seed.test-support'

const createFixture = multipartFixture()

it('refuses part numbers and lengths outside the declared file size without ending the upload', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 6)
  for (const partNumber of [0, -1, 1.5, 2]) {
    const response = await sendPart(
      fixture,
      uploadId,
      partNumber,
      new Uint8Array(6),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'attachment_part_invalid' },
    })
  }
  const wrongLength = await sendPart(fixture, uploadId, 1, new Uint8Array(5))
  expect(wrongLength.status).toBe(400)
  expect(await wrongLength.json()).toMatchObject({
    error: { code: 'attachment_part_size_mismatch' },
  })
  const tooLarge = await sendPart(fixture, uploadId, 1, new Uint8Array(6), {
    query: '?fixtureBody=large-length',
  })
  expect(tooLarge.status).toBe(413)
  expect(await tooLarge.json()).toMatchObject({
    error: { code: 'attachment_too_large' },
  })
  expect(await uploadRecord(fixture, uploadId)).toMatchObject({
    state: 'uploading',
  })
})

it('replaces a confirmed part and completes the draft with the new receipt and exact binary bytes', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 6, DRAFT_TARGET)
  const first = await sendPart(fixture, uploadId, 1, new Uint8Array(6), {
    target: DRAFT_TARGET,
  })
  expect(first.status).toBe(200)
  const earlier = await partReceipt(first)
  const bytes = new Uint8Array([0, 255, 128, 13, 10, 65])
  const second = await sendPart(fixture, uploadId, 1, bytes, {
    target: DRAFT_TARGET,
  })
  expect(second.status).toBe(200)
  const replacement = await partReceipt(second)
  expect(replacement.partNumber).toBe(1)
  expect(replacement.etag).not.toBe(earlier.etag)
  const response = await completeUpload(
    fixture,
    uploadId,
    [replacement],
    DRAFT_TARGET,
  )
  expect(response.status).toBe(201)
  const stored = await uploadRecord(fixture, uploadId)
  const object = await attachmentBucket(fixture.env).get(stored.objectKey)
  if (!object) throw new Error('The object is missing.')
  expect(new Uint8Array(await object.arrayBuffer())).toEqual(bytes)
  expect(stored).toMatchObject({
    state: 'ready',
    multipartId: null,
    sizeBytes: 6,
  })
})

it('refuses parts and completion by another member or through another target', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 1)
  const part = await sendPart(fixture, uploadId, 1, new Uint8Array([1]))
  expect(part.status).toBe(200)
  const receipt = await partReceipt(part)
  for (const cookie of [
    fixture.cookies.memberCookie,
    fixture.cookies.outsiderCookie,
  ]) {
    const denied = await sendPart(fixture, uploadId, 1, new Uint8Array([2]), {
      headers: { Cookie: cookie },
    })
    expect(denied.status).toBe(404)
    const complete = await completeUpload(
      fixture,
      uploadId,
      [receipt],
      undefined,
      { Cookie: cookie },
    )
    expect(complete.status).toBe(404)
  }
  for (const target of [
    DRAFT_TARGET,
    { type: 'workspace' as const, workspaceId: OTHER_WORKSPACE },
  ]) {
    expect(
      (await sendPart(fixture, uploadId, 1, new Uint8Array([2]), { target }))
        .status,
    ).toBe(404)
    expect(
      (await completeUpload(fixture, uploadId, [receipt], target)).status,
    ).toBe(404)
  }
  expect((await completeUpload(fixture, uploadId, [receipt])).status).toBe(201)
})

it('stores no replacement when the received bytes disagree with the part Content-Length', async () => {
  const fixture = await createFixture()
  const uploadId = await startedUpload(fixture, 6)
  const bytes = new Uint8Array([9, 8, 7, 6, 5, 4])
  const first = await sendPart(fixture, uploadId, 1, bytes)
  expect(first.status).toBe(200)
  const receipt = await partReceipt(first)
  for (const fault of ['short', 'long', 'interrupted', 'after-bytes']) {
    const response = await sendPart(fixture, uploadId, 1, new Uint8Array(6), {
      query: `?fixtureBody=${fault}`,
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'attachment_upload_interrupted' },
    })
  }
  expect((await completeUpload(fixture, uploadId, [receipt])).status).toBe(201)
  const stored = await uploadRecord(fixture, uploadId)
  const object = await attachmentBucket(fixture.env).get(stored.objectKey)
  if (!object) throw new Error('The object is missing.')
  expect(new Uint8Array(await object.arrayBuffer())).toEqual(bytes)
})
