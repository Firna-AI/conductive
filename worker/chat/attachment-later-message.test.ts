import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { FILE_BYTES } from './attachment.test-support'
import {
  AGENT_BYTES,
  attachmentOwnerFixture,
} from './attachment-owner.test-support'
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

it('restores the original bytes at the same file path for each later message', async () => {
  const { copy, fixture, file, session, runner } =
    await attachmentOwnerFixture(harness)
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'first-file', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    copy.release.resolve()
    await fixture.drainAttachments()
    const first = messageCommands(runner, 'first-file')[0]
    const path = first?.attachments[0]?.path
    if (!path) throw new Error('The first message has no copied path.')
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
    expect(copy.writes).toEqual([
      { sandboxId: 'sandbox-owner', path },
      { sandboxId: 'sandbox-owner', path },
    ])
    expect(copy.read('sandbox-owner', path)).toEqual(FILE_BYTES)
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
