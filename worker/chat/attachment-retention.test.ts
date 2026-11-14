import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { detachFailedSandbox } from '../lifecycle/failed-workspace-data'
import { completeCreationAttempt } from '../lifecycle/creation-attempt-data'
import {
  attachmentOwnerFixture,
  selectAttachmentComputer,
} from './attachment-owner.test-support'
import { readAttachment } from './attachment-data'
import {
  cleanupDraftAttachments,
  purgeWorkspaceAttachments,
} from './attachment-cleanup'
import { attachmentBucket } from './attachment-record'
import { WORKSPACE_ID } from './harness.test-support'
import { messageCommands } from './turn-lifecycle.test-support'

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

it('marks the destination before proof and deletes only the bytes after the proof commits', async () => {
  const { fixture, copy, runner, file, session } =
    await attachmentOwnerFixture(harness)
  const bucket = attachmentBucket(harness.env)
  await harness.env.DB.prepare("UPDATE workspaces SET state = 'ready'").run()
  let proofCommitted = false
  await fixture.setStorageHooks({
    beforeCommit: async (staged) => {
      if (
        !staged.writes.some((key) => key.startsWith('chat:v1:attachment-copy:'))
      )
        return
      const record = await readAttachment(harness.env.DB, file.id)
      expect(record).toMatchObject({
        transferredSandboxId: 'sandbox-owner',
        bytesDeletedAt: null,
      })
      expect(await bucket.head(record?.objectKey ?? '')).not.toBeNull()
    },
    afterCommit: async (staged) => {
      if (
        !staged.writes.some((key) => key.startsWith('chat:v1:attachment-copy:'))
      )
        return
      const record = await readAttachment(harness.env.DB, file.id)
      expect(await bucket.head(record?.objectKey ?? '')).not.toBeNull()
      proofCommitted = true
    },
  })
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'retained-file', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    copy.release.resolve()
    await fixture.drainAttachments()
    const record = await readAttachment(harness.env.DB, file.id)
    expect(record).toMatchObject({
      state: 'claimed',
      name: file.name,
      sizeBytes: 6,
      transferredSandboxId: 'sandbox-owner',
      bytesDeletedAt: expect.any(Number),
    })
    expect(await bucket.head(record?.objectKey ?? '')).toBeNull()
    expect(proofCommitted).toBe(true)
    expect(messageCommands(runner, 'retained-file')).toHaveLength(1)
    await purgeWorkspaceAttachments(harness.env, WORKSPACE_ID, async () => {})
    expect(await readAttachment(harness.env.DB, file.id)).toBeNull()
  } finally {
    await fixture.clearFaults()
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})

it('keeps bytes through a failed first start and replacement transfer, then sweeps them after first-start success', async () => {
  const { fixture, copy, runner, file, session } =
    await attachmentOwnerFixture(harness)
  await harness.env.DB.prepare("UPDATE workspaces SET state = 'ready'").run()
  await harness.env.DB.prepare(
    `INSERT INTO workspace_creation_attempts
    (workspace_id, org_id, sender_user_id, first_message_id, created_at) VALUES (?, ?, ?, 'first', 0)`,
  )
    .bind(WORKSPACE_ID, fixture.org.id, fixture.owner.id)
    .run()
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'first-start-file', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    copy.release.resolve()
    await fixture.drainAttachments()
    const record = await readAttachment(harness.env.DB, file.id)
    expect(record).toMatchObject({
      transferredSandboxId: 'sandbox-owner',
      bytesDeletedAt: null,
    })
    await cleanupDraftAttachments(harness.env, TEST_TIME)
    expect(
      await attachmentBucket(harness.env).head(record?.objectKey ?? ''),
    ).not.toBeNull()
    runner.disconnect()
    await detachFailedSandbox(
      harness.env.DB,
      fixture.org.id,
      WORKSPACE_ID,
      'sandbox-owner',
      'boat',
    )
    await harness.env.DB.prepare(
      "UPDATE workspace_creation_attempts SET state = 'failed'",
    ).run()
    await selectAttachmentComputer(harness, 'replacement-sandbox')
    await fixture.restart()
    await fixture.connect(runner)
    await fixture.drainAttachments()
    expect(copy.writes).toHaveLength(2)
    expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
      transferredSandboxId: 'replacement-sandbox',
      bytesDeletedAt: null,
    })
    await harness.env.DB.prepare(
      "UPDATE workspace_creation_attempts SET state = 'pending'",
    ).run()
    await completeCreationAttempt(harness.env.DB, WORKSPACE_ID)
    await cleanupDraftAttachments(harness.env, TEST_TIME)
    expect(
      await attachmentBucket(harness.env).head(record?.objectKey ?? ''),
    ).toBeNull()
    expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
      state: 'claimed',
      bytesDeletedAt: TEST_TIME,
    })
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
