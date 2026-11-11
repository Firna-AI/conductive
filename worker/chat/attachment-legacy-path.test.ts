import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentFixture } from './attachment.test-support'
import { prepareMessageAttachments } from './attachment-copy'
import { providerCopy } from './attachment-copy.test-support'
import { selectAttachmentComputer } from './attachment-owner.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { chatKey } from './storage-keys'
import { messageCommands } from './turn-lifecycle.test-support'
import type { PendingCommand } from './types'

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

it.each(['absolute', 'message-relative'] as const)(
  'fails a legacy %s path through copy preparation despite stored proof',
  async (kind) => {
    const provider = providerCopy()
    const fixture = await attachmentFixture(harness, {
      prepareAttachments: (...args) =>
        prepareMessageAttachments(harness.env, ...args, provider.fetch),
    })
    await selectAttachmentComputer(harness, 'sandbox-legacy')
    const file = await fixture.upload()
    const session = await fixture.createSession()
    expect(
      (await fixture.sendAttachment(session.id, 'legacy-message', [file.id]))
        .status,
    ).toBe(202)
    const [pending] = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.pending(),
    )
    if (!pending || (pending.type !== 'turn' && pending.type !== 'message'))
      throw new Error('The accepted command is missing.')
    const key = chatKey('command', pending.commandId)
    const stored = await fixture.storage.get<{
      command: PendingCommand
      order: number
    }>(key)
    await fixture.storage.put(key, {
      ...stored,
      command: {
        ...pending,
        attachments:
          kind === 'absolute'
            ? [{ attachmentId: file.id, path: '/home/user/legacy.dat' }]
            : [
                {
                  attachmentId: file.id,
                  relativePath: '.context/attachments/old-message/binary.dat',
                },
              ],
      },
    })
    await fixture.chat.store.change(
      WORKSPACE_ID,
      (view) => view.saveAttachmentCopy('legacy-message', 'sandbox-legacy'),
      () => undefined,
    )
    const runner = await fixture.connect()
    try {
      runner.emit({ type: 'runner.ready' })
      await fixture.drainAttachments()
      expect(messageCommands(runner, 'legacy-message')).toEqual([])
      expect(
        await fixture.chat.store.read(WORKSPACE_ID, (view) =>
          view.session(session.id),
        ),
      ).toMatchObject({ activeTurnId: null, retryMessageId: 'legacy-message' })
      const history = await fixture.history(session.id)
      expect(
        history.events.find((envelope) => envelope.event.type === 'turn.failed')
          ?.event,
      ).toMatchObject({
        error: {
          code: 'attachment_not_found',
          message: 'The attached file is not available. Upload it again.',
        },
        retryMessageId: 'legacy-message',
      })
    } finally {
      runner.disconnect()
    }
  },
)
