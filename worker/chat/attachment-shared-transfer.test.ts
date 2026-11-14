import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentTemporaryPath } from '../test-support/attachment-command'
import { attachmentOwnerFixture } from './attachment-owner.test-support'
import { FILE_BYTES } from './attachment.test-support'
import { messageCommands, terminalEvent } from './turn-lifecycle.test-support'
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

it('makes two messages in different sessions wait for one active file transfer', async () => {
  const { copy, fixture, file, session, runner } =
    await attachmentOwnerFixture(harness)
  const second = await fixture.createSession()
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'shared-first', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    expect(
      (await fixture.sendAttachment(second.id, 'shared-second', [file.id]))
        .status,
    ).toBe(202)
    await fixture.drain()
    expect(messageCommands(runner, 'shared-first')).toEqual([])
    expect(messageCommands(runner, 'shared-second')).toEqual([])
    copy.release.resolve()
    await fixture.drainAttachments()
    const first = messageCommands(runner, 'shared-first')[0]
    const later = messageCommands(runner, 'shared-second')[0]
    expect(first?.attachments).toEqual(later?.attachments)
    expect(copy.writes).toHaveLength(1)
    expect(copy.maximumWriters).toBe(1)
    if (first?.type !== 'turn') throw new Error('The first turn is missing.')
    runner.emit(terminalEvent(first, 'finished'))
    await fixture.drain()
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(first.turnId),
      ),
    ).toMatchObject({ state: 'finished' })
    expect(
      copy.read('sandbox-owner', first?.attachments[0]?.path ?? ''),
    ).toEqual(FILE_BYTES)
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, async (view) => [
        await view.attachmentCopy('shared-first', 'sandbox-owner'),
        await view.attachmentCopy('shared-second', 'sandbox-owner'),
      ]),
    ).toEqual([true, true])
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})

it('starts a fresh download and temporary file after restart before the message proof commits', async () => {
  const { copy, fixture, file, session, runner } =
    await attachmentOwnerFixture(harness)
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'restart-file', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    runner.disconnect()
    await fixture.restart()
    await fixture.connect(runner)
    await copy.settleReplacements()
    await fixture.drain()
    const command = messageCommands(runner, 'restart-file')[0]
    expect(command?.attachments).toHaveLength(1)
    expect(copy.writes).toHaveLength(2)
    expect(
      copy.read('sandbox-owner', command?.attachments[0]?.path ?? ''),
    ).toEqual(FILE_BYTES)
    const started = copy.requests.filter((request) => request.method === 'POST')
    const commands = await Promise.all(
      started.map(async (request) => {
        const input: { command: string } = await request.clone().json()
        return input.command
      }),
    )
    expect(commands).toHaveLength(2)
    expect(attachmentTemporaryPath(commands[0])).not.toBe(
      attachmentTemporaryPath(commands[1]),
    )
  } finally {
    copy.release.resolve()
    await copy.settleCopies()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
