import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, FILE_BYTES, held } from './attachment.test-support'
import { readAttachment } from './attachment-data'
import { attachmentBucket } from './attachment-record'
import { storeAttachment } from './attachment-storage'

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

it('stores exact binary and empty file bytes with private owned records', async () => {
  const fixture = await attachmentFixture(harness)
  const attachment = await fixture.upload()
  expect(await fixture.bytes(attachment.id)).toEqual(FILE_BYTES)
  expect(attachment).toEqual({
    id: attachment.id,
    name: 'binary.dat',
    kind: 'file',
    mediaType: 'application/octet-stream',
    sizeBytes: 6,
  })
  const record = await readAttachment(harness.env.DB, attachment.id)
  expect(record).toMatchObject({
    orgId: fixture.org.id,
    uploaderUserId: fixture.owner.id,
    state: 'ready',
    expiresAt: TEST_TIME + 604_800_000,
  })
  const empty = await fixture.upload(new Uint8Array())
  expect(empty.sizeBytes).toBe(0)
  expect(await fixture.bytes(empty.id)).toEqual(new Uint8Array())
})

it('streams 25 MB into one object and rejects the first excess decoded byte', async () => {
  const fixture = await attachmentFixture(harness)
  const stream = (extra: boolean) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let number = 0; number < 5; number++)
          controller.enqueue(new Uint8Array(5_000_000).fill(number))
        if (extra) controller.enqueue(new Uint8Array([128]))
        controller.close()
      },
    })
  const attachment = await fixture.upload(stream(false))
  expect(attachment.sizeBytes).toBe(25_000_000)
  const stored = await fixture.bytes(attachment.id)
  expect(stored.byteLength).toBe(25_000_000)
  expect([stored[0], stored[5_000_000], stored[24_999_999]]).toEqual([0, 1, 4])
  await expect(fixture.upload(stream(true))).rejects.toMatchObject({
    status: 413,
    code: 'attachment_too_large',
  })
  expect(await readAttachment(harness.env.DB, 'stored-file-2')).toBeNull()
  expect(
    (await attachmentBucket(harness.env).list()).objects.map(
      (object) => object.key,
    ),
  ).toHaveLength(1)
})

it('refuses a different uploader, org, or workspace before message acceptance', async () => {
  const fixture = await attachmentFixture(harness)
  const attachment = await fixture.upload()
  const session = await fixture.createSession()
  const other = await fixture.sendAttachment(
    session.id,
    'other-user',
    [attachment.id],
    fixture.memberCookie,
  )
  expect(other.status).toBe(404)
  expect(await other.json()).toEqual({
    error: {
      code: 'attachment_not_found',
      message: 'The attached file is not available. Upload it again.',
    },
  })
  await harness.env.DB.prepare(
    "UPDATE chat_attachments SET target_id = 'another-workspace' WHERE id = ?",
  )
    .bind(attachment.id)
    .run()
  expect(
    (
      await fixture.sendAttachment(session.id, 'wrong-workspace', [
        attachment.id,
      ])
    ).status,
  ).toBe(404)
  const secondOrg = await harness.createOrg(fixture.ownerCookie, 'Another org')
  await harness.env.DB.prepare(
    'UPDATE chat_attachments SET org_id = ? WHERE id = ?',
  )
    .bind(secondOrg.id, attachment.id)
    .run()
  expect(
    (await fixture.sendAttachment(session.id, 'wrong-org', [attachment.id]))
      .status,
  ).toBe(404)
  expect(
    await fixture.chat.store.read(fixture.target.workspaceId, (view) =>
      view.attachmentUse(attachment.id),
    ),
  ).toBeUndefined()
})

it('removes a late completed upload when its owner loses access before publication', async () => {
  const fixture = await attachmentFixture(harness)
  const entered = held<void>()
  const release = held<void>()
  let sent = false
  const source = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (sent) {
          controller.close()
          return
        }
        sent = true
        entered.resolve()
        await release.promise
        controller.enqueue(FILE_BYTES)
      },
    },
    { highWaterMark: 0 },
  )
  const storing = storeAttachment(
    harness.env,
    {
      orgId: fixture.org.id,
      uploaderUserId: fixture.owner.id,
      target: fixture.target,
      name: 'late.dat',
      kind: 'file',
      mediaType: 'application/octet-stream',
    },
    source,
    { now: () => TEST_TIME, newId: () => 'late-upload' },
  )
  await entered.promise
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, fixture.owner.id)
    .run()
  release.resolve()
  await expect(storing).rejects.toMatchObject({ code: 'attachment_not_found' })
  expect(await readAttachment(harness.env.DB, 'late-upload')).toBeNull()
  expect((await attachmentBucket(harness.env).list()).objects).toEqual([])
})
