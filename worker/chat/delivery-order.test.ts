import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import type { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentFixture, held } from './attachment.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'
import type { ChatDependencies, StoredTurn } from './types'

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

function heldCopy(messageId: string, fail = false) {
  const entered = held<void>()
  const release = held<void>()
  const copiedMessages: string[] = []
  const dependencies: Partial<ChatDependencies> = {
    attachmentSandboxId: async () => 'sandbox-order',
    prepareAttachments: async (_workspaceId, _senderId, copyingMessageId) => {
      copiedMessages.push(copyingMessageId)
      if (copyingMessageId === messageId) {
        entered.resolve()
        await release.promise
        if (fail) throw new Error('An injected copy failure')
      }
      return 'sandbox-order'
    },
  }
  return { entered, release, copiedMessages, dependencies }
}

function sentMessages(runner: FakeRunner) {
  return runner.commands.flatMap((command) =>
    command.type === 'turn' || command.type === 'message'
      ? [command.message.id]
      : [],
  )
}

it('holds later messages behind a running copy while another turn proceeds', async () => {
  const copy = heldCopy('first-file')
  const fixture = await attachmentFixture(harness, copy.dependencies)
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const independent = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await startTurn(fixture, runner, session.id, 'start-order')
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'first-file', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    await fixture.send(session.id, 'later-text')
    expect(
      (await fixture.sendAttachment(session.id, 'later-file', [file.id]))
        .status,
    ).toBe(202)
    await fixture.send(independent.id, 'other-turn')
    await fixture.drain()
    expect(sentMessages(runner)).toEqual(['start-order', 'other-turn'])
    expect(copy.copiedMessages).toEqual(['first-file'])
    copy.release.resolve()
    await fixture.drainAttachments()
    expect(sentMessages(runner)).toEqual([
      'start-order',
      'other-turn',
      'first-file',
      'later-text',
      'later-file',
    ])
    expect(copy.copiedMessages).toEqual(['first-file', 'later-file'])
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})

it('sends Stop past a held running copy and never sends its later messages', async () => {
  const copy = heldCopy('stop-file')
  const fixture = await attachmentFixture(harness, copy.dependencies)
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'start-stop')
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'stop-file', [file.id])).status,
    ).toBe(202)
    await copy.entered.promise
    await fixture.send(session.id, 'after-stop-file')
    const stopped = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId: turn.turnId },
    )
    expect(stopped.status).toBe(200)
    expect(runner.commands.map((command) => command.type)).toEqual([
      'turn',
      'interrupt',
    ])
    expect(sentMessages(runner)).toEqual(['start-stop'])
    runner.emit(terminalEvent(turn, 'stopped'))
    await fixture.drain()
    copy.release.resolve()
    await fixture.drainAttachments()
    expect(sentMessages(runner)).toEqual(['start-stop'])
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(turn.turnId),
      ),
    ).toMatchObject({ state: 'stopped' })
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})

it('fails only the copy turn and releases its hold before later work', async () => {
  const copy = heldCopy('failed-file', true)
  const notifications: {
    turnId: string
    state: StoredTurn['state'] | undefined
  }[] = []
  let onEnded: ChatDependencies['turnEnded'] = async () => {}
  const fixture = await attachmentFixture(harness, {
    ...copy.dependencies,
    turnEnded: (...args) => onEnded(...args),
  })
  onEnded = async (_workspaceId, turnId) => {
    const turn = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turnId),
    )
    notifications.push({ turnId, state: turn?.state })
  }
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const independent = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'start-failure')
  const otherTurn = await startTurn(
    fixture,
    runner,
    independent.id,
    'independent-start',
  )
  try {
    expect(
      (await fixture.sendAttachment(session.id, 'failed-file', [file.id]))
        .status,
    ).toBe(202)
    await copy.entered.promise
    await fixture.send(session.id, 'discarded-later-message')
    await fixture.clock.advance(250)
    copy.release.resolve()
    await fixture.drainAttachments()
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(turn.turnId),
      ),
    ).toMatchObject({ state: 'failed' })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.session(session.id),
      ),
    ).toMatchObject({ activeTurnId: null, retryMessageId: 'failed-file' })
    expect(notifications).toEqual([{ turnId: turn.turnId, state: 'failed' }])
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(otherTurn.turnId),
      ),
    ).toMatchObject({ state: 'running' })
    expect(
      (await fixture.history(session.id)).events
        .map(({ event }) => event)
        .filter((event) => event.type === 'turn.failed'),
    ).toEqual([
      {
        type: 'turn.failed',
        sessionId: session.id,
        turnId: turn.turnId,
        error: {
          code: 'attachment_copy_failed',
          message:
            'The attached files could not reach the cloud computer. Try again.',
        },
        retryMessageId: 'failed-file',
        durationMs: 250,
      },
    ])
    await fixture.send(session.id, 'next-turn')
    await fixture.send(independent.id, 'independent-message')
    expect(sentMessages(runner)).toEqual([
      'start-failure',
      'independent-start',
      'next-turn',
      'independent-message',
    ])
  } finally {
    copy.release.resolve()
    await fixture.drainAttachments()
    runner.disconnect()
  }
})
