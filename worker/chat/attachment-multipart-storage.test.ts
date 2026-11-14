import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { AppEnv } from '../env'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, held } from './attachment.test-support'
import { readAttachment } from './attachment-data'
import {
  completeAttachmentUpload,
  startAttachmentUpload,
} from './attachment-multipart-storage'
import { attachmentBucket } from './attachment-record'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

async function pendingUpload() {
  const fixture = await attachmentFixture(harness)
  const id = await startAttachmentUpload(
    harness.env,
    {
      orgId: fixture.org.id,
      uploaderUserId: fixture.member.id,
      target: fixture.target,
      name: 'publication.bin',
      kind: 'file',
      mediaType: 'application/octet-stream',
    },
    1,
    { now: () => TEST_TIME, newId: () => 'publication-upload' },
  )
  const record = await readAttachment(harness.env.DB, id)
  if (!record?.multipartId) throw new Error('The upload is missing.')
  const bucket = attachmentBucket(harness.env)
  const part = await bucket
    .resumeMultipartUpload(record.objectKey, record.multipartId)
    .uploadPart(1, new Uint8Array([7]))
  return { fixture, record, parts: [part], bucket }
}

function holdCompletion(
  env: AppEnv,
  entered: () => void,
  release: Promise<void>,
): AppEnv {
  return {
    ...env,
    CHAT_ATTACHMENTS: new Proxy(attachmentBucket(env), {
      get(target, property) {
        if (property === 'resumeMultipartUpload')
          return (key: string, id: string) => {
            const upload = target.resumeMultipartUpload(key, id)
            return {
              key: upload.key,
              uploadId: upload.uploadId,
              abort: () => upload.abort(),
              uploadPart: (
                partNumber: number,
                value:
                  | ReadableStream
                  | ArrayBuffer
                  | ArrayBufferView
                  | string
                  | Blob,
              ) => upload.uploadPart(partNumber, value),
              complete: async (parts: R2UploadedPart[]) => {
                const object = await upload.complete(parts)
                entered()
                await release
                return object
              },
            }
          }
        return Reflect.get(target, property, target)
      },
    }),
  }
}

it('checks access again after R2 completion and removes the file when membership changed', async () => {
  const { fixture, record, parts, bucket } = await pendingUpload()
  const entered = held<void>()
  const release = held<void>()
  const complete = completeAttachmentUpload(
    holdCompletion(harness.env, () => entered.resolve(), release.promise),
    record,
    parts,
    () => TEST_TIME,
  )
  try {
    await entered.promise
    await harness.env.DB.prepare(
      'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
    )
      .bind(fixture.org.id, fixture.member.id)
      .run()
  } finally {
    release.resolve()
  }
  await expect(complete).rejects.toMatchObject({
    status: 404,
    code: 'attachment_not_found',
  })
  expect(await readAttachment(harness.env.DB, record.id)).toBeNull()
  expect(await bucket.get(record.objectKey)).toBeNull()
})

it('lets one completion publish while a competing completion cannot delete its file', async () => {
  const { record, parts, bucket } = await pendingUpload()
  const entered = held<void>()
  const release = held<void>()
  const stale = { ...record }
  const complete = completeAttachmentUpload(
    holdCompletion(harness.env, () => entered.resolve(), release.promise),
    record,
    parts,
    () => TEST_TIME,
  )
  try {
    await entered.promise
    await expect(
      completeAttachmentUpload(harness.env, stale, parts, () => TEST_TIME),
    ).rejects.toMatchObject({ status: 404, code: 'attachment_not_found' })
  } finally {
    release.resolve()
  }
  expect(await complete).toMatchObject({ id: record.id, sizeBytes: 1 })
  expect(await readAttachment(harness.env.DB, record.id)).toMatchObject({
    state: 'ready',
  })
  expect((await bucket.head(record.objectKey))?.size).toBe(1)
})
