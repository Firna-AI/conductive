import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { ImportStorageError } from '../../src/shared/conductor-import-storage'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  held,
  immutableKey,
  localBucket,
  observeGets,
  partFor,
  storageFixture,
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

async function documents() {
  const fixture = storageFixture(harness, { maxPartBytes: 2, maxReadBytes: 1 })
  const chunks = [
    new Uint8Array([65, 226]),
    new Uint8Array([130]),
    new Uint8Array([172, 10]),
  ]
  const parts = []
  for (const [index, bytes] of chunks.entries())
    parts.push(
      await fixture.seal(partFor(bytes, String(index), 'document'), bytes),
    )
  return { parts }
}

it('streams exact UTF-8 bytes across parts only when the consumer reads', async () => {
  const { parts } = await documents()
  const reads: string[] = []
  const bucket = observeGets(localBucket(harness), (key, read) => {
    reads.push(key)
    return read()
  })
  const { storage } = storageFixture(harness, {
    bucket,
    maxPartBytes: 2,
    maxReadBytes: 1,
  })
  const reader = storage.streamDocument(parts).getReader()
  expect(reads).toEqual([])
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false })
  const first = await reader.read()
  expect(first.value).toEqual(new Uint8Array([65, 226]))
  let text = decoder.decode(first.value, { stream: true })
  await Promise.resolve()
  expect(reads).toEqual([immutableKey(parts[0])])
  const second = await reader.read()
  expect(second.value).toEqual(new Uint8Array([130]))
  text += decoder.decode(second.value, { stream: true })
  expect(reads).toEqual([immutableKey(parts[0]), immutableKey(parts[1])])
  const third = await reader.read()
  expect(third.value).toEqual(new Uint8Array([172, 10]))
  text += decoder.decode(third.value, { stream: true })
  text += decoder.decode()
  expect(text).toBe('A€\n')
  expect(await reader.read()).toEqual({ done: true, value: undefined })
  expect(reads).toEqual(parts.map(immutableKey))
})

it('cancels an in-flight document body and starts no later part', async () => {
  const { parts } = await documents()
  const entered = held<void>()
  const cancelled = held<void>()
  let cancelCount = 0
  const reads: string[] = []
  const bucket = observeGets(localBucket(harness), async (key, read) => {
    reads.push(key)
    const object = await read()
    if (!object) return null
    return withBody(
      object,
      new ReadableStream<Uint8Array>(
        {
          pull() {
            entered.resolve()
          },
          cancel() {
            cancelCount++
            cancelled.resolve()
          },
        },
        { highWaterMark: 0 },
      ),
    )
  })
  const { storage } = storageFixture(harness, { bucket })
  const reader = storage.streamDocument(parts).getReader()
  const reading = reader.read()
  await entered.promise
  await reader.cancel()
  expect(cancelCount).toBe(1)
  await cancelled.promise
  expect(await reading).toEqual({ done: true, value: undefined })
  expect(reads).toEqual([immutableKey(parts[0])])
})

it('cancels a part that arrives after cancellation of its pending lookup', async () => {
  const { parts } = await documents()
  const entered = held<void>()
  const release = held<void>()
  const cancelled = held<void>()
  const inspected = held<void>()
  let cancelCount = 0
  const reads: string[] = []
  const bucket = observeGets(localBucket(harness), async (key, read) => {
    reads.push(key)
    const object = await read()
    if (!object) return null
    entered.resolve()
    await release.promise
    return withBody(
      object,
      new ReadableStream<Uint8Array>(
        {
          cancel() {
            cancelCount++
            cancelled.resolve()
          },
        },
        { highWaterMark: 0 },
      ),
      () => inspected.resolve(),
    )
  })
  const { storage } = storageFixture(harness, { bucket })
  const reader = storage.streamDocument(parts).getReader()
  const reading = reader.read()
  await entered.promise
  await reader.cancel()
  release.resolve()
  await inspected.promise
  expect(cancelCount).toBe(1)
  await cancelled.promise
  expect(await reading).toEqual({ done: true, value: undefined })
  expect(reads).toEqual([immutableKey(parts[0])])
})

it('propagates missing parts and failed byte reads without reading later parts', async () => {
  const { parts } = await documents()
  const bucket = localBucket(harness)
  const failure = new Error('Injected object read failure')
  const reads: string[] = []
  const wrapped = observeGets(bucket, async (key, read) => {
    reads.push(key)
    const object = await read()
    if (!object) return null
    return withBody(
      object,
      new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            controller.error(failure)
          },
        },
        { highWaterMark: 0 },
      ),
    )
  })
  const fixture = storageFixture(harness, { bucket: wrapped })
  const reader = fixture.storage.streamDocument(parts).getReader()
  await expect(reader.read()).rejects.toBe(failure)
  expect(reads).toEqual([immutableKey(parts[0])])
  await bucket.delete(immutableKey(parts[0]))
  const missing = storageFixture(harness)
    .storage.streamDocument(parts)
    .getReader()
  await expect(missing.read()).rejects.toEqual(
    new ImportStorageError('part_missing'),
  )
})

it('refuses work parts in old documents and propagates failed part verification', async () => {
  const fixture = storageFixture(harness)
  const bytes = new Uint8Array([65])
  const work = await fixture.seal(partFor(bytes, 'work'), bytes)
  await expect(
    fixture.storage.streamDocument([work]).getReader().read(),
  ).rejects.toEqual(new ImportStorageError('invalid_part'))
  const doc = await fixture.seal(partFor(bytes, 'doc', 'document'), bytes)
  await fixture.bucket.put(immutableKey(doc), new Uint8Array([66]))
  await expect(
    fixture.storage.streamDocument([doc]).getReader().read(),
  ).rejects.toEqual(new ImportStorageError('part_mismatch'))
})
