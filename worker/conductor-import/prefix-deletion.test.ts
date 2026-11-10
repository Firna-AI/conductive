import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  HELLO,
  HELLO_PART,
  immutableKey,
  keysForScope,
  localBucket,
  storageFixture,
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

it('deletes each scoped page without touching documents, sibling prefixes, or attachments', async () => {
  const bucket = localBucket(harness)
  let pages = 0
  const wrapped = new Proxy(bucket, {
    get(target, property) {
      if (property === 'list')
        return (options?: R2ListOptions) => {
          pages++
          return target.list({ ...options, limit: 2 })
        }
      return Reflect.get(target, property, target)
    },
  })
  const fixture = storageFixture(harness, {
    bucket: wrapped,
    scope: { orgId: '../org/é', reservationId: '../reservation' },
  })
  const sibling = storageFixture(harness, {
    scope: { orgId: '../org/é', reservationId: '../reservation-next' },
  })
  const otherOrg = storageFixture(harness, {
    scope: { orgId: '../org/é-next', reservationId: '../reservation' },
  })
  await fixture.seal(HELLO_PART, HELLO)
  await fixture.seal({ ...HELLO_PART, id: 'part-2' }, HELLO)
  const document = await fixture.seal(
    { ...HELLO_PART, group: 'document' },
    HELLO,
  )
  const siblingPart = await sibling.seal(HELLO_PART, HELLO)
  const otherPart = await otherOrg.seal(HELLO_PART, HELLO)
  const attachmentKey = 'attachments/another-org/file-1'
  await bucket.put(attachmentKey, HELLO)
  const preserved = [
    attachmentKey,
    ...(await keysForScope(bucket, siblingPart.scope)),
    ...(await keysForScope(bucket, otherPart.scope)),
  ]
  await fixture.storage.deleteObjects('work')
  expect(pages).toBe(2)
  await expect(
    fixture.storage.readPart(document, { offset: 0, length: 3 }),
  ).resolves.toEqual(new Uint8Array([104, 101, 108]))
  await expect(
    sibling.storage.readPart(siblingPart, { offset: 0, length: 3 }),
  ).resolves.toEqual(new Uint8Array([104, 101, 108]))
  await expect(
    otherOrg.storage.readPart(otherPart, { offset: 0, length: 3 }),
  ).resolves.toEqual(new Uint8Array([104, 101, 108]))
  await fixture.storage.deleteObjects()
  expect(await bucket.head(immutableKey(document))).toBeNull()
  expect(
    (await bucket.list()).objects.map((object) => object.key).sort(),
  ).toEqual(preserved.sort())
})
