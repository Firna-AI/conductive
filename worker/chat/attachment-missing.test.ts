import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  attachmentOwnerFixture,
  selectAttachmentComputer,
} from './attachment-owner.test-support'
import {
  downloadedAttachment,
  latestAttachmentFailure,
} from './attachment-transfer.test-support'
import { storeAttachment } from './attachment-storage'
import { FILE_BYTES } from './attachment.test-support'
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

it('checks all files and names a missing file and changed size in message order', async () => {
  const { copy, fixture, session, runner } =
    await attachmentOwnerFixture(harness)
  await harness.env.DB.prepare("UPDATE workspaces SET state = 'ready'").run()
  const upload = (id: string, name: string) =>
    storeAttachment(
      harness.env,
      {
        orgId: fixture.org.id,
        uploaderUserId: fixture.owner.id,
        target: fixture.target,
        name,
        kind: 'file',
        mediaType: 'application/octet-stream',
      },
      FILE_BYTES,
      { now: () => TEST_TIME, newId: () => id },
    )
  const files = [
    await upload('missing-z', 'z.txt'),
    await upload('changed-a', 'a.txt'),
    await upload('present-c', 'c.txt'),
  ]
  try {
    expect(
      (
        await fixture.sendAttachment(
          session.id,
          'all-files',
          files.map((file) => file.id),
        )
      ).status,
    ).toBe(202)
    await copy.entered.promise
    copy.release.resolve()
    await fixture.drainAttachments()
    const paths = messageCommands(runner, 'all-files')[0]?.attachments
    if (!paths) throw new Error('The file paths are missing.')
    harness.boat.files.clear()
    harness.boat.setFile('sandbox-owner', paths[1]?.path ?? '', 5)
    harness.boat.setFile('sandbox-owner', paths[2]?.path ?? '', 6)
    expect(
      (
        await fixture.sendAttachment(
          session.id,
          'missing-files',
          files.map((file) => file.id),
        )
      ).status,
    ).toBe(202)
    await fixture.drainAttachments()
    expect((await latestAttachmentFailure(fixture))?.error).toEqual({
      code: 'attachment_missing',
      message:
        'z.txt and a.txt are no longer in the cloud computer. Attach them again in a new message.',
    })
    expect(messageCommands(runner, 'missing-files')).toEqual([])
    expect(
      copy.metadataRequests.map((request) =>
        new URL(request.url).searchParams.get('path'),
      ),
    ).toEqual(paths.map((file) => file.path))
    expect(copy.writes).toHaveLength(3)
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})

it('fails a new sandbox after byte deletion without downloading or checking its file metadata', async () => {
  const { fixture, copy, runner, file, session } =
    await downloadedAttachment(harness)
  try {
    await selectAttachmentComputer(harness, 'other-sandbox')
    expect(
      (await fixture.sendAttachment(session.id, 'other-computer', [file.id]))
        .status,
    ).toBe(202)
    await fixture.drainAttachments()
    expect((await latestAttachmentFailure(fixture))?.error?.code).toBe(
      'attachment_missing',
    )
    expect(messageCommands(runner, 'other-computer')).toEqual([])
    expect(copy.writes).toHaveLength(1)
    expect(copy.metadataRequests).toEqual([])
  } finally {
    runner.disconnect()
  }
})

it('reports provider metadata outages as copy failures instead of missing files', async () => {
  const { fixture, copy, runner, file, session } =
    await downloadedAttachment(harness)
  try {
    harness.boat.failure = { status: 503, code: 'unavailable' }
    expect(
      (await fixture.sendAttachment(session.id, 'provider-down', [file.id]))
        .status,
    ).toBe(202)
    await fixture.drainAttachments()
    expect((await latestAttachmentFailure(fixture))?.error).toEqual({
      code: 'attachment_copy_failed',
      message:
        'The attached files could not reach the cloud computer. Try again.',
    })
    expect(messageCommands(runner, 'provider-down')).toEqual([])
    expect(copy.writes).toHaveLength(1)
  } finally {
    harness.boat.failure = null
    runner.disconnect()
  }
})
