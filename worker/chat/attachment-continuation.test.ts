import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  AGENT_BYTES,
  attachmentOwnerFixture,
} from './attachment-owner.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import {
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'
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
it('shares a held message copy with its continuation and preserves agent edits after delivery', async () => {
  const { copy, fixture, file, session, runner } =
    await attachmentOwnerFixture(harness)
  const messageId = 'held-continuation-file'
  fixture.observeOutgoing((command) => {
    if (
      (command.type === 'turn' || command.type === 'message') &&
      command.message.id === messageId
    )
      for (const attachment of command.attachments)
        copy.edit('sandbox-owner', attachment.path)
    return false
  })
  const turn = await startTurn(fixture, runner, session.id, 'held-start')
  try {
    expect(
      (await fixture.sendAttachment(session.id, messageId, [file.id])).status,
    ).toBe(202)
    await copy.entered.promise
    const original = await fixture.chat.store.read(WORKSPACE_ID, async (view) =>
      (await view.pending()).find(
        (command) => 'messageId' in command && command.messageId === messageId,
      ),
    )
    runner.emit(terminalEvent(turn, 'finished'))
    await fixture.drain()
    await copy.settleReplacements()
    await fixture.drain()
    const continuation = await fixture.chat.store.read(
      WORKSPACE_ID,
      async (view) =>
        (await view.pending()).find(
          (command) =>
            'messageId' in command && command.messageId === messageId,
        ),
    )
    expect(continuation).toMatchObject({ type: 'turn', messageId })
    expect(continuation?.commandId).not.toBe(original?.commandId)
    expect.soft(copy.maximumWriters).toBe(1)
    expect.soft(messageCommands(runner, messageId)).toEqual([])
    runner.disconnect()
    await fixture.connect(runner)
    await fixture.drain()
    await copy.settleReplacements()
    await fixture.drain()
    copy.release.resolve()
    await fixture.drainAttachments()
    const sent = messageCommands(runner, messageId)
    expect.soft(sent).toHaveLength(1)
    expect.soft(copy.writes).toHaveLength(1)
    expect.soft(copy.lateWrites).toBe(0)
    expect
      .soft(copy.read('sandbox-owner', sent[0]?.attachments[0]?.path ?? ''))
      .toEqual(AGENT_BYTES)
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
it('keeps message copy proof after continuation replaces its command and after restart', async () => {
  const { copy, fixture, file, session, runner } =
    await attachmentOwnerFixture(harness)
  const messageId = 'prepared-continuation-file'
  const turn = await startTurn(fixture, runner, session.id, 'prepared-start')
  try {
    expect(
      (await fixture.sendAttachment(session.id, messageId, [file.id])).status,
    ).toBe(202)
    await copy.entered.promise
    copy.release.resolve()
    await fixture.drainAttachments()
    const original = messageCommands(runner, messageId)[0]
    if (!original) throw new Error('The prepared message was not delivered.')
    const path = original.attachments[0]?.path ?? ''
    copy.edit('sandbox-owner', path)
    runner.emit(terminalEvent(turn, 'finished'))
    await fixture.drain()
    await fixture.drainAttachments()
    const continuation = messageCommands(runner, messageId)[1]
    expect(continuation).toMatchObject({ type: 'turn' })
    expect(continuation?.commandId).not.toBe(original.commandId)
    expect(continuation?.attachments).toEqual(original.attachments)
    expect.soft(copy.writes).toHaveLength(1)
    expect.soft(copy.read('sandbox-owner', path)).toEqual(AGENT_BYTES)
    runner.disconnect()
    await fixture.restart()
    await fixture.connect(runner)
    await fixture.drainAttachments()
    expect.soft(messageCommands(runner, messageId)).toHaveLength(3)
    expect.soft(copy.writes).toHaveLength(1)
    expect.soft(copy.lateWrites).toBe(0)
    expect.soft(copy.read('sandbox-owner', path)).toEqual(AGENT_BYTES)
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
it('fails the current continuation when its shared message copy fails', async () => {
  const { copy, fixture, file, session, runner } = await attachmentOwnerFixture(
    harness,
    true,
  )
  const messageId = 'failed-continuation-file'
  const turn = await startTurn(fixture, runner, session.id, 'failure-start')
  try {
    expect(
      (await fixture.sendAttachment(session.id, messageId, [file.id])).status,
    ).toBe(202)
    await copy.entered.promise
    runner.emit(terminalEvent(turn, 'finished'))
    await fixture.drain()
    await copy.settleReplacements()
    await fixture.drain()
    const continuationId = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.messageTurn(messageId),
    )
    expect(continuationId).not.toBe(turn.turnId)
    copy.release.resolve()
    await fixture.drainAttachments()
    expect.soft(messageCommands(runner, messageId)).toEqual([])
    expect.soft(copy.writes).toHaveLength(1)
    expect
      .soft(
        await fixture.chat.store.read(WORKSPACE_ID, (view) =>
          view.turn(continuationId ?? ''),
        ),
      )
      .toMatchObject({ state: 'failed' })
    expect
      .soft(
        await fixture.chat.store.read(WORKSPACE_ID, (view) =>
          view.session(session.id),
        ),
      )
      .toMatchObject({ activeTurnId: null, retryMessageId: messageId })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(turn.turnId),
      ),
    ).toMatchObject({ state: 'finished' })
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
