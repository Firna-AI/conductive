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
import { failedAttachmentDeletes } from '../test-support/attachment-r2'
import { reportingFixture } from '../error-reporting/reporting.test-support'
import { withWorkerErrorScope } from '../error-reporting/scope'
import { attachmentFixture } from './attachment.test-support'
import { cleanupDraftAttachments } from './attachment-cleanup'
import { readAttachment } from './attachment-data'
import { storeAttachment } from './attachment-storage'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => harness.dispose())

it('reports a hidden attachment cleanup failure and retains its retry record', async () => {
  const fixture = await attachmentFixture(harness)
  const attachment = await fixture.upload()
  const reporting = reportingFixture()
  await withWorkerErrorScope(reporting.runtime, { component: 'cron' }, () =>
    cleanupDraftAttachments(
      failedAttachmentDeletes(harness.env),
      TEST_TIME + 604800000,
    ),
  )
  await reporting.runtime.flush()
  expect(await readAttachment(harness.env.DB, attachment.id)).toMatchObject({
    state: 'deleting',
  })
  expect(reporting.envelopes).toHaveLength(1)
  expect(reporting.envelopes[0][1][0][1]).toMatchObject({
    tags: { classification: 'attachment_cleanup_retry' },
  })
  expect(reporting.serialized()).not.toContain(attachment.id)
})

it('reports failed upload cleanup without replacing the original upload error', async () => {
  const fixture = await attachmentFixture(harness)
  const reporting = reportingFixture()
  const original = new Error('private upload failure')
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(original)
    },
  })
  const storing = withWorkerErrorScope(
    reporting.runtime,
    { component: 'request' },
    () =>
      storeAttachment(
        failedAttachmentDeletes(harness.env),
        {
          orgId: fixture.org.id,
          uploaderUserId: fixture.owner.id,
          target: fixture.target,
          name: 'private-file',
          kind: 'file',
          mediaType: 'application/octet-stream',
        },
        body,
        { now: () => TEST_TIME, newId: () => 'private-upload' },
      ),
  )
  await expect(storing).rejects.toBe(original)
  await reporting.runtime.flush()
  expect(reporting.envelopes).toHaveLength(1)
  expect(reporting.envelopes[0][1][0][1]).toMatchObject({
    tags: { classification: 'attachment_upload_cleanup_retry' },
  })
  expect(reporting.serialized()).not.toContain('private')
})
