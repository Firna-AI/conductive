import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { ImportStorageError } from '../../src/shared/conductor-import-storage'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createR2ImportStorage } from './r2-storage'
import {
  HELLO,
  HELLO_PART,
  SCOPE,
  held,
  immutableKey,
  localBucket,
  observeGets,
  partFor,
  storageFixture,
  temporaryKey,
  withBody,
} from './storage.test-support'

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

it('creates a short-lived PUT target bound to one part, size, and hash', async () => {
  const { storage, env } = storageFixture(harness)
  const target = await storage.createUploadTarget(HELLO_PART)
  expect(Object.keys(target).sort()).toEqual([
    'expiresAt',
    'headers',
    'identity',
    'method',
    'url',
  ])
  expect(target).toMatchObject({
    method: 'PUT',
    expiresAt: Date.parse('2026-11-10T12:39:56Z'),
    headers: {
      'content-length': '5',
      'if-none-match': '*',
      'x-amz-content-sha256': HELLO_PART.sha256,
    },
    identity: { scope: SCOPE, part: HELLO_PART, uploadId: 'upload-1' },
  })
  const url = new URL(target.url)
  expect(url.searchParams.get('X-Amz-Date')).toBe('20261110T123456Z')
  expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
  expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe(
    'content-length;host;if-none-match;x-amz-content-sha256',
  )
  expect(url.searchParams.get('X-Amz-Signature')).toBe(
    'bc6fee4e3bc508e083756aba1741a8e416e76788e688c0ddca6eafae8a1bd6e7',
  )
  expect(target.url).not.toContain('example-secret-key')
  const later = await storage.createUploadTarget(HELLO_PART)
  expect(later.identity.uploadId).toBe('upload-2')
  expect(later.url).not.toBe(target.url)
  await expect(
    createR2ImportStorage(harness.env, SCOPE, {
      maxPartBytes: 8,
      maxReadBytes: 3,
    }).createUploadTarget(HELLO_PART),
  ).rejects.toEqual(new ImportStorageError('not_configured'))
  await expect(
    createR2ImportStorage(
      { ...env, CHAT_ATTACHMENTS_S3_BUCKET_URL: 'invalid-bucket-url' },
      SCOPE,
      { maxPartBytes: 8, maxReadBytes: 3 },
    ).createUploadTarget(HELLO_PART),
  ).rejects.toEqual(new ImportStorageError('not_configured'))
})

it('seals actual bytes and treats false metadata, wrong size, and absence as missing', async () => {
  const fixture = storageFixture(harness)
  const wrong = await fixture.upload(
    HELLO_PART,
    new TextEncoder().encode('jello'),
  )
  await expect(fixture.storage.sealPart(wrong.identity)).resolves.toBeNull()
  const short = await fixture.upload(HELLO_PART, HELLO.slice(0, 4))
  expect(await fixture.storage.sealPart(short.identity)).toBeNull()
  const missing = await fixture.storage.createUploadTarget(HELLO_PART)
  expect(await fixture.storage.sealPart(missing.identity)).toBeNull()
  const correct = await fixture.upload(HELLO_PART, HELLO)
  expect(await fixture.storage.sealPart(correct.identity)).toEqual({
    scope: SCOPE,
    part: HELLO_PART,
  })
})

it('seals empty parts and streams empty old documents', async () => {
  const fixture = storageFixture(harness)
  const part = partFor(new Uint8Array(), 'empty', 'document')
  const target = await fixture.upload(part, new Uint8Array())
  const sealed = await fixture.storage.sealPart(target.identity)
  expect(sealed).toEqual({ scope: SCOPE, part })
  if (!sealed) throw new Error('Expected a sealed empty part')
  expect(
    await fixture.storage.readPart(sealed, { offset: 0, length: 0 }),
  ).toEqual(new Uint8Array())
  expect(
    await new Response(fixture.storage.streamDocument([sealed])).text(),
  ).toBe('')
  expect(await new Response(fixture.storage.streamDocument([])).text()).toBe('')
})

it('keeps sealed bytes immutable after upload replay and repeated seals', async () => {
  const fixture = storageFixture(harness)
  const target = await fixture.upload(HELLO_PART, HELLO)
  const sealed = await fixture.storage.sealPart(target.identity)
  expect(sealed).toEqual({ scope: SCOPE, part: HELLO_PART })
  if (!sealed) throw new Error('Expected a sealed part')
  await fixture.bucket.put(
    temporaryKey(target),
    new TextEncoder().encode('jello'),
  )
  expect(await fixture.storage.sealPart(target.identity)).toEqual(sealed)
  expect(
    await fixture.storage.readPart(sealed, { offset: 0, length: 3 }),
  ).toEqual(new Uint8Array([104, 101, 108]))
})

it('seals concurrent requests through one atomic immutable write', async () => {
  const bucket = localBucket(harness)
  const entered = held<void>()
  const release = held<void>()
  let writes = 0
  let lostWrites = 0
  const wrapped = new Proxy(bucket, {
    get(target, property) {
      if (property === 'put')
        return async (
          key: string,
          value: Uint8Array,
          options?: R2PutOptions,
        ) => {
          if (key === immutableKey({ scope: SCOPE, part: HELLO_PART })) {
            if (++writes === 2) entered.resolve()
            await release.promise
          }
          const result = await target.put(key, value, options)
          if (!result) lostWrites++
          return result
        }
      return Reflect.get(target, property, target)
    },
  })
  const fixture = storageFixture(harness, { bucket: wrapped })
  const target = await fixture.upload(HELLO_PART, HELLO)
  const first = fixture.storage.sealPart(target.identity)
  const second = fixture.storage.sealPart(target.identity)
  await entered.promise
  release.resolve()
  expect(await Promise.all([first, second])).toEqual([
    { scope: SCOPE, part: HELLO_PART },
    { scope: SCOPE, part: HELLO_PART },
  ])
  expect(lostWrites).toBe(1)
})

it('checks actual winner bytes when another seal wins the conditional write', async () => {
  const bucket = localBucket(harness)
  const wrapped = new Proxy(bucket, {
    get(target, property) {
      if (property === 'put')
        return async (
          key: string,
          value: Uint8Array,
          options?: R2PutOptions,
        ) => {
          if (options?.onlyIf)
            await target.put(key, new TextEncoder().encode('jello'), {
              customMetadata: { sha256: HELLO_PART.sha256 },
            })
          return target.put(key, value, options)
        }
      return Reflect.get(target, property, target)
    },
  })
  const fixture = storageFixture(harness, { bucket: wrapped })
  const target = await fixture.upload(HELLO_PART, HELLO)
  expect(await fixture.storage.sealPart(target.identity)).toBeNull()
})

it('bounds ranges and refuses a different org or reservation', async () => {
  const fixture = storageFixture(harness)
  const sealed = await fixture.seal(HELLO_PART, HELLO)
  expect(
    await fixture.storage.readPart(sealed, { offset: 1, length: 3 }),
  ).toEqual(new Uint8Array([101, 108, 108]))
  for (const range of [
    { offset: -1, length: 1 },
    { offset: 0, length: 4 },
    { offset: 4, length: 2 },
    { offset: 0.5, length: 1 },
  ])
    await expect(fixture.storage.readPart(sealed, range)).rejects.toEqual(
      new ImportStorageError('invalid_range'),
    )
  for (const scope of [
    { ...SCOPE, orgId: 'another-org' },
    { ...SCOPE, reservationId: 'another-reservation' },
  ]) {
    await expect(
      fixture.storage.readPart({ ...sealed, scope }, { offset: 0, length: 1 }),
    ).rejects.toEqual(new ImportStorageError('scope_mismatch'))
    await expect(
      fixture.storage.sealPart({
        scope,
        part: HELLO_PART,
        uploadId: 'upload-1',
      }),
    ).rejects.toEqual(new ImportStorageError('scope_mismatch'))
  }
  await expect(
    fixture.storage.createUploadTarget({ ...HELLO_PART, sizeBytes: 9 }),
  ).rejects.toEqual(new ImportStorageError('invalid_part'))
})

it('counts stored bytes and cancels overflow when metadata claims the expected size', async () => {
  const bucket = localBucket(harness)
  let cancelled = 0
  const wrapped = observeGets(bucket, async (_key, read) => {
    const object = await read()
    if (!object) return null
    return withBody(
      object,
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([104, 101, 108, 108, 111, 0]))
        },
        cancel() {
          cancelled++
        },
      }),
    )
  })
  const fixture = storageFixture(harness, { bucket: wrapped })
  const target = await fixture.upload(HELLO_PART, HELLO)
  expect(await fixture.storage.sealPart(target.identity)).toBeNull()
  expect(cancelled).toBe(1)
  expect(
    await bucket.head(immutableKey({ scope: SCOPE, part: HELLO_PART })),
  ).toBeNull()
  const shortBucket = observeGets(bucket, async (_key, read) => {
    const object = await read()
    if (!object) return null
    return withBody(
      object,
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([65]))
          controller.close()
        },
      }),
    )
  })
  const short = storageFixture(harness, { bucket: shortBucket })
  const bytes = new Uint8Array([65, 0])
  const shortTarget = await short.upload(partFor(bytes, 'zero-suffix'), bytes)
  expect(await short.storage.sealPart(shortTarget.identity)).toBeNull()
})
