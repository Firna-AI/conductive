import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { attachmentPath } from '../../src/shared/attachment-paths'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { failedAttachmentDeletes } from '../test-support/attachment-r2'
import { attachmentFixture } from './attachment.test-support'
import { selectAttachmentComputer } from './attachment-owner.test-support'
import { providerCopy } from './attachment-copy.test-support'
import { prepareMessageAttachments } from './attachment-copy'
import { attachmentBucket } from './attachment-record'
import { readAttachment } from './attachment-data'
import {
  cleanupDraftAttachments,
  purgeOrgAttachments,
} from './attachment-cleanup'
import { WORKSPACE_ID } from './harness.test-support'

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

it('retries byte deletion after a lost completion without removing metadata and still permits org purge', async () => {
  const fixture = await attachmentFixture(harness)
  await selectAttachmentComputer(harness, 'cleanup-sandbox')
  await harness.env.DB.prepare("UPDATE workspaces SET state = 'ready'").run()
  const file = await fixture.upload()
  const session = await fixture.createSession()
  expect(
    (await fixture.sendAttachment(session.id, 'cleanup-file', [file.id]))
      .status,
  ).toBe(202)
  const provider = providerCopy(harness.env)
  await prepareMessageAttachments(
    harness.env,
    WORKSPACE_ID,
    fixture.owner.id,
    'cleanup-file',
    [{ attachmentId: file.id, relativePath: await attachmentPath(file) }],
    'cleanup-sandbox',
    provider.fetch,
  )
  await fixture.chat.store.change(
    WORKSPACE_ID,
    (view) => view.saveAttachmentCopy('cleanup-file', 'cleanup-sandbox'),
    () => {},
  )
  const record = await readAttachment(harness.env.DB, file.id)
  expect(record).toMatchObject({
    transferredSandboxId: 'cleanup-sandbox',
    bytesDeletedAt: null,
  })
  await cleanupDraftAttachments(failedAttachmentDeletes(harness.env), TEST_TIME)
  expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
    bytesDeletedAt: null,
    state: 'claimed',
  })
  expect(
    await attachmentBucket(harness.env).head(record?.objectKey ?? ''),
  ).not.toBeNull()
  await cleanupDraftAttachments(harness.env, TEST_TIME)
  expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
    bytesDeletedAt: TEST_TIME,
    state: 'claimed',
    name: 'binary.dat',
    sizeBytes: 6,
  })
  expect(
    await attachmentBucket(harness.env).head(record?.objectKey ?? ''),
  ).toBeNull()
  await purgeOrgAttachments(harness.env, fixture.org.id, async () => {})
  expect(await readAttachment(harness.env.DB, file.id)).toBeNull()
})
