import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { SendMessageResponse } from '../../src/shared/messages'
import { retryMessagePath } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentFixture, held } from './attachment.test-support'
import { connectAttachmentEngine } from './attachment-engine.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import {
  lifecycleSnapshot,
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

it('cancels a running copy failure before the real engine starts Try again without a Worker wait', async () => {
  let fail = true
  const fixture = await attachmentFixture(harness, {
    attachmentSandboxId: async () => 'sandbox-cancellation',
    prepareAttachments: async () => {
      if (fail) throw new Error('An injected copy failure')
      return 'sandbox-cancellation'
    },
  })
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const engine = await connectAttachmentEngine(fixture, runner)
  const exit = held<void>()
  try {
    await fixture.send(session.id, 'live-start')
    await engine.drain()
    const original = messageCommands(runner, 'live-start')[0]
    if (original?.type !== 'turn') throw new Error('The live turn is missing.')
    const provider = engine.providers.latest
    provider.stop = async () => {
      provider.stops++
      await exit.promise
      provider.closed = true
    }
    expect(
      (await fixture.sendAttachment(session.id, 'live-file', [file.id])).status,
    ).toBe(202)
    await fixture.drainAttachments()
    fail = false
    const response = await fixture.fetch(
      retryMessagePath(fixture.org.id, WORKSPACE_ID, session.id, 'live-file'),
      {},
    )
    expect(response.status).toBe(202)
    const retry: SendMessageResponse = await response.json()
    await fixture.drainAttachments()
    const beforeExit = {
      commands: runner.commands.map((command) => command.type),
      providers: engine.providers.processes.length,
      stops: provider.stops,
    }
    exit.resolve()
    await engine.drain()
    expect(engine.providers.processes).toHaveLength(2)
    expect(
      engine.providers.latest.messages.map((input) => input.message.id),
    ).toEqual([retry.message.id])
    expect(beforeExit).toEqual({
      commands: ['turn', 'interrupt', 'turn'],
      providers: 1,
      stops: 1,
    })
    expect(
      engine.events.filter((event) => event.type === 'turn.failed'),
    ).toEqual([])
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.turn(original.turnId),
      ),
    ).toMatchObject({ state: 'failed' })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.session(session.id),
      ),
    ).toMatchObject({
      activeTurnId: retry.session.activeTurnId,
      retryMessageId: null,
    })
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toEqual([])
  } finally {
    exit.resolve()
    await engine.drain()
    runner.disconnect()
  }
})

it('replays stored copy-failure interrupts after restart and clears only the matching late end', async () => {
  const fixture = await attachmentFixture(harness, {
    prepareAttachments: async () => {
      throw new Error('An injected copy failure')
    },
  })
  const file = await fixture.upload()
  const first = await fixture.createSession()
  const second = await fixture.createSession()
  const runner = await fixture.connect()
  try {
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const firstTurn = await startTurn(fixture, runner, first.id, 'first-start')
    const secondTurn = await startTurn(
      fixture,
      runner,
      second.id,
      'second-start',
    )
    fixture.transport.dropOutgoing = (command) => command.type === 'interrupt'
    for (const [sessionId, messageId] of [
      [first.id, 'first-failed-file'],
      [second.id, 'second-failed-file'],
    ]) {
      expect(
        (await fixture.sendAttachment(sessionId, messageId, [file.id])).status,
      ).toBe(202)
      await fixture.drainAttachments()
    }
    const interrupts = await fixture.chat.store.read(
      WORKSPACE_ID,
      async (view) =>
        (await view.pending()).filter(
          (command) => command.type === 'interrupt',
        ),
    )
    expect(interrupts).toMatchObject([
      { type: 'interrupt', sessionId: first.id, turnId: firstTurn.turnId },
      { type: 'interrupt', sessionId: second.id, turnId: secondTurn.turnId },
    ])
    const secondInterrupt = interrupts[1]
    if (!secondInterrupt) throw new Error('The second cancellation is missing.')
    runner.disconnect()
    fixture.restart()
    fixture.transport.dropOutgoing = () => false
    await fixture.connect(runner)
    await fixture.drainAttachments()
    expect(
      runner.commands.filter((command) => command.type === 'interrupt'),
    ).toEqual(interrupts)
    const before = await lifecycleSnapshot(fixture)
    runner.emit({
      type: 'assistant.delta',
      sessionId: first.id,
      turnId: firstTurn.turnId,
      messageId: 'late-copy-answer',
      text: 'The failure already ended this turn.',
    })
    await fixture.drain()
    expect(await lifecycleSnapshot(fixture)).toEqual(before)
    const completed = runner.emit(terminalEvent(firstTurn, 'stopped'))
    await fixture.drain()
    expect(await lifecycleSnapshot(fixture)).toEqual({
      ...before,
      commands: [secondInterrupt],
    })
    const history = await fixture.history(first.id)
    expect(history.events.at(-1)).toMatchObject({
      late: true,
      event: completed.event,
    })
    runner.sendEnvelope(completed)
    await fixture.drain()
    expect(await fixture.history(first.id)).toEqual(history)
    runner.emit(terminalEvent(secondTurn, 'stopped'))
    await fixture.drain()
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toEqual([])
  } finally {
    runner.disconnect()
  }
})
