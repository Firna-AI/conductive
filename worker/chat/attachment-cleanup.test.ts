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

it('expires unclaimed drafts at seven days', async () => {
  const fixture = await attachmentFixture(harness)
  const draft = await fixture.upload()
  await cleanupDraftAttachments(harness.env, TEST_TIME + 604_799_999)
  expect(await readAttachment(harness.env.DB, draft.id)).toMatchObject({
    state: 'ready',
  })
  await cleanupDraftAttachments(harness.env, TEST_TIME + 604_800_000)
  expect(await readAttachment(harness.env.DB, draft.id)).toBeNull()
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
  const firstClaim = await readAttachment(harness.env.DB, first.id)
  if (!firstClaim) throw new Error('The claim is missing.')
  const expiry = fixture.chat.runLifecycle(() =>
    expireClaimedAttachment(
      harness.env,
      fixture.chat.store,
      WORKSPACE_ID,
      firstClaim.orgId,
      firstClaim.id,
      firstClaim.revision,
      TEST_TIME + 604_800_000,
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
  const abandonedClaim = await readAttachment(harness.env.DB, abandoned.id)
  if (!abandonedClaim) throw new Error('The claim is missing.')
  await fixture.chat.runLifecycle(() =>
    expireClaimedAttachment(
      harness.env,
      fixture.chat.store,
      WORKSPACE_ID,
      abandonedClaim.orgId,
      abandonedClaim.id,
      abandonedClaim.revision,
      TEST_TIME + 604_800_000,
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
