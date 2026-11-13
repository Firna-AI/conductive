import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { retryMessagePath } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { AGENT_BYTES } from './attachment-owner.test-support'
import { messageCommands, terminalEvent } from './turn-lifecycle.test-support'
import {
  downloadedAttachment,
  latestAttachmentFailure,
} from './attachment-transfer.test-support'
import { attachmentBucket } from './attachment-record'
import { readAttachment } from './attachment-data'
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

it('checks a later file without another transfer or R2 read and keeps a same-size agent edit', async () => {
  const {
    copy,
    fixture,
    file,
    session,
    runner,
    command: first,
    path,
  } = await downloadedAttachment(harness)
  const reads = vi.spyOn(attachmentBucket(harness.env), 'get')
  try {
    expect(await readAttachment(harness.env.DB, file.id)).toMatchObject({
      bytesDeletedAt: expect.any(Number),
    })
    copy.edit('sandbox-owner', path)
    expect(copy.read('sandbox-owner', path)).toEqual(AGENT_BYTES)
    expect(
      (await fixture.sendAttachment(session.id, 'later-file', [file.id]))
        .status,
    ).toBe(202)
    await fixture.drainAttachments()
    expect(messageCommands(runner, 'later-file')[0]?.attachments).toEqual(
      first.attachments,
    )
    expect(copy.writes).toEqual([{ sandboxId: 'sandbox-owner', path }])
    expect(copy.read('sandbox-owner', path)).toEqual(AGENT_BYTES)
    expect(copy.metadataRequests).toHaveLength(1)
    expect(reads).not.toHaveBeenCalled()
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.attachmentCopy('later-file', 'sandbox-owner'),
      ),
    ).toBe(true)
  } finally {
    reads.mockRestore()
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})

it('lets Try again check a restored file after a missing-file failure without another transfer', async () => {
  const { copy, fixture, file, session, runner, command, path } =
    await downloadedAttachment(harness)
  try {
    runner.emit(terminalEvent(command, 'finished'))
    await fixture.drain()
    harness.boat.files.clear()
    expect(
      (await fixture.sendAttachment(session.id, 'missing-retry', [file.id]))
        .status,
    ).toBe(202)
    await fixture.drainAttachments()
    expect((await latestAttachmentFailure(fixture))?.error).toEqual({
      code: 'attachment_missing',
      message:
        'binary.dat is no longer in the cloud computer. Attach it again in a new message.',
    })
    harness.boat.setFile('sandbox-owner', path, 6)
    const retry = await fixture.fetch(
      retryMessagePath(
        fixture.org.id,
        WORKSPACE_ID,
        session.id,
        'missing-retry',
      ),
      {},
    )
    expect(retry.status).toBe(202)
    await fixture.drainAttachments()
    const turns = runner.commands.filter((outbound) => outbound.type === 'turn')
    expect(turns).toHaveLength(2)
    expect(turns[1]?.attachments).toEqual(command.attachments)
    expect(copy.writes).toHaveLength(1)
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.attachmentCopy(turns[1]?.message.id ?? '', 'sandbox-owner'),
      ),
    ).toBe(true)
  } finally {
    runner.disconnect()
  }
})
