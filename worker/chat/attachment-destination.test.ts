import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentFixture, FILE_BYTES, held } from './attachment.test-support'
import {
  AGENT_BYTES,
  attachmentOwnerCopy,
  selectAttachmentComputer,
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
it('binds an owner to its selected computer while a new computer copies independently', async () => {
  const entered = held<void>()
  const release = held<void>()
  const copy = attachmentOwnerCopy(harness)
  let calls = 0
  const fixture = await attachmentFixture(harness, {
    prepareAttachments: async (...args) => {
      if (++calls === 1) {
        entered.resolve()
        await release.promise
      }
      return copy.prepare(...args)
    },
  })
  await selectAttachmentComputer(harness, 'sandbox-old')
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const messageId = 'changed-destination-file'
  try {
    expect(
      (await fixture.sendAttachment(session.id, messageId, [file.id])).status,
    ).toBe(202)
    await entered.promise
    await selectAttachmentComputer(harness, 'sandbox-new')
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await copy.entered.promise
    copy.release.resolve()
    await copy.settleCopies()
    await fixture.drain()
    const command = messageCommands(runner, messageId)[0]
    if (!command) throw new Error('The new computer did not get its turn.')
    const path = command.attachments[0]?.path ?? ''
    copy.edit('sandbox-new', path)
    release.resolve()
    await fixture.drainAttachments()
    expect.soft(copy.writes).toEqual([{ sandboxId: 'sandbox-new', path }])
    expect.soft(copy.lateWrites).toBe(0)
    expect.soft(copy.read('sandbox-new', path)).toEqual(AGENT_BYTES)
    runner.disconnect()
    await fixture.restart()
    await selectAttachmentComputer(harness, 'sandbox-old')
    await fixture.connect(runner)
    await fixture.drainAttachments()
    expect.soft(copy.writes).toEqual([
      { sandboxId: 'sandbox-new', path },
      { sandboxId: 'sandbox-old', path },
    ])
    expect.soft(copy.read('sandbox-old', path)).toEqual(FILE_BYTES)
    expect(messageCommands(runner, messageId)).toHaveLength(2)
  } finally {
    release.resolve()
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
