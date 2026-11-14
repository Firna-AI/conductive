import { expect } from 'vitest'
import type { TestHarness } from '../test-support/harness'
import { attachmentOwnerFixture } from './attachment-owner.test-support'
import { messageCommands } from './turn-lifecycle.test-support'
import { WORKSPACE_ID } from './harness.test-support'

export async function downloadedAttachment(harness: TestHarness) {
  const setup = await attachmentOwnerFixture(harness)
  await harness.env.DB.prepare("UPDATE workspaces SET state = 'ready'").run()
  expect(
    (
      await setup.fixture.sendAttachment(setup.session.id, 'initial-file', [
        setup.file.id,
      ])
    ).status,
  ).toBe(202)
  await setup.copy.entered.promise
  setup.copy.release.resolve()
  await setup.fixture.drainAttachments()
  const command = messageCommands(setup.runner, 'initial-file')[0]
  if (command?.type !== 'turn') throw new Error('The first turn is missing.')
  const path = command.attachments[0]?.path
  if (!path) throw new Error('The copied path is missing.')
  return { ...setup, command, path }
}

export async function latestAttachmentFailure(
  fixture: Awaited<ReturnType<typeof attachmentOwnerFixture>>['fixture'],
) {
  return fixture.chat.store.read(WORKSPACE_ID, async (view) =>
    (await view.turns()).filter((turn) => turn.state === 'failed').at(-1),
  )
}
