import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, held } from './attachment.test-support'
import { attachmentBucket } from './attachment-record'
import { readAttachment } from './attachment-data'
import {
  cleanupDraftAttachments,
  expireClaimedAttachment,
  purgeOrgAttachments,
  purgeWorkspaceAttachments,
} from './attachment-cleanup'
import { WORKSPACE_ID } from './harness.test-support'
import { failedAttachmentDeletes } from '../test-support/attachment-r2'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it('expires unsent drafts at seven days and keeps accepted queued files of surviving workspaces', async () => {
  const fixture = await attachmentFixture(harness)
  const draft = await fixture.upload()
  const accepted = await fixture.upload()
  const session = await fixture.createSession()
  expect(
    (await fixture.sendAttachment(session.id, 'accepted-file', [accepted.id]))
      .status,
  ).toBe(202)
  const expire = (
    record: { orgId: string; id: string; revision: number },
    now: number,
  ) =>
    fixture.chat.runLifecycle(() =>
      expireClaimedAttachment(
        harness.env,
        fixture.chat.store,
        WORKSPACE_ID,
        record.orgId,
        record.id,
        record.revision,
        now,
      ),
    )
  await cleanupDraftAttachments(harness.env, TEST_TIME + 604_799_999, expire)
  expect(await readAttachment(harness.env.DB, draft.id)).toMatchObject({
    state: 'ready',
  })
  await cleanupDraftAttachments(harness.env, TEST_TIME + 604_800_000, expire)
  expect(await readAttachment(harness.env.DB, draft.id)).toBeNull()
  expect(await fixture.bytes(accepted.id)).toEqual(
    new Uint8Array([0, 255, 128, 13, 10, 65]),
  )
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.message('accepted-file'),
    ),
  ).toMatchObject({ state: 'queued' })
})

it('queues expiry behind message acceptance and removes a claim after a rolled back acceptance', async () => {
  const fixture = await attachmentFixture(harness)
  const first = await fixture.upload()
  const session = await fixture.createSession()
  const entered = held<void>()
  const release = held<void>()
  fixture.storage.beforeCommit = async () => {
    entered.resolve()
    await release.promise
  }
  const sending = fixture.sendAttachment(session.id, 'winning-message', [
    first.id,
  ])
  await entered.promise
  const expiry = cleanupDraftAttachments(
    harness.env,
    TEST_TIME + 604_800_000,
    (record, now) =>
      fixture.chat.runLifecycle(() =>
        expireClaimedAttachment(
          harness.env,
          fixture.chat.store,
          WORKSPACE_ID,
          record.orgId,
          record.id,
          record.revision,
          now,
        ),
      ),
  )
  fixture.storage.beforeCommit = null
  release.resolve()
  expect((await sending).status).toBe(202)
  await expiry
  expect(await readAttachment(harness.env.DB, first.id)).toMatchObject({
    state: 'claimed',
  })
  const abandoned = await fixture.upload()
  fixture.storage.beforeCommit = async () => {
    throw new Error('Injected acceptance rollback')
  }
  expect(
    (await fixture.sendAttachment(session.id, 'rolled-back', [abandoned.id]))
      .status,
  ).toBe(500)
  fixture.storage.beforeCommit = null
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.attachmentUse(abandoned.id),
    ),
  ).toBeUndefined()
  await cleanupDraftAttachments(
    harness.env,
    TEST_TIME + 604_800_000,
    (record, now) =>
      fixture.chat.runLifecycle(() =>
        expireClaimedAttachment(
          harness.env,
          fixture.chat.store,
          WORKSPACE_ID,
          record.orgId,
          record.id,
          record.revision,
          now,
        ),
      ),
  )
  expect(await readAttachment(harness.env.DB, abandoned.id)).toBeNull()
  expect(await readAttachment(harness.env.DB, first.id)).toMatchObject({
    state: 'claimed',
  })
})

it('keeps a deletion tombstone after an external failure and retries workspace and zero-workspace org purge', async () => {
  const fixture = await attachmentFixture(harness)
  const workspaceFile = await fixture.upload()
  const draftFile = await fixture.upload(new Uint8Array([1]), {
    type: 'new-workspace',
    messageId: 'first-draft',
  })
  const bucket = attachmentBucket(harness.env)
  await expect(
    purgeWorkspaceAttachments(
      failedAttachmentDeletes(harness.env),
      WORKSPACE_ID,
      async () => {},
    ),
  ).rejects.toThrow('Injected R2 delete failure')
  expect(await readAttachment(harness.env.DB, workspaceFile.id)).toMatchObject({
    state: 'deleting',
  })
  await purgeWorkspaceAttachments(harness.env, WORKSPACE_ID, async () => {})
  expect(await readAttachment(harness.env.DB, workspaceFile.id)).toBeNull()
  expect(await readAttachment(harness.env.DB, draftFile.id)).toMatchObject({
    state: 'ready',
  })
  await purgeOrgAttachments(harness.env, fixture.org.id, async () => {})
  expect(await readAttachment(harness.env.DB, draftFile.id)).toBeNull()
  expect((await bucket.list()).objects).toEqual([])
})

it('removes a late orphan object when its retained file record is already gone', async () => {
  const fixture = await attachmentFixture(harness)
  const file = await fixture.upload()
  const record = await readAttachment(harness.env.DB, file.id)
  if (!record) throw new Error('The file record is missing')
  await purgeOrgAttachments(harness.env, fixture.org.id, async () => {})
  await attachmentBucket(harness.env).put(
    record.objectKey,
    new Uint8Array([1]),
    { customMetadata: { attachmentId: record.id, orgId: record.orgId } },
  )
  await cleanupDraftAttachments(harness.env, TEST_TIME)
  expect((await attachmentBucket(harness.env).list()).objects).toEqual([])
})
