import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, FILE_BYTES } from './attachment.test-support'
import { readAttachment } from './attachment-data'
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
    path: '.context/attachments/c3e4b3dbbe634274e657a474e2a0c9a3/binary.dat',
    kind: 'file',
    mediaType: 'application/octet-stream',
    sizeBytes: 6,
  })
  const record = await readAttachment(harness.env.DB, attachment.id)
  expect(record).toMatchObject({
    orgId: fixture.org.id,
    uploaderUserId: fixture.owner.id,
    state: 'ready',
    expiresAt: TEST_TIME + 604800000,
  })
  const empty = await fixture.upload(new Uint8Array())
  expect(empty.sizeBytes).toBe(0)
  expect(await fixture.bytes(empty.id)).toEqual(new Uint8Array())
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
