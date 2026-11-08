import { afterAll, beforeAll, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { checkCommitBoundaries } from './commit-boundary.test-support'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps the agent event and cursor together across both commit boundaries', async () => {
  await checkCommitBoundaries(async () => {
    await harness.reset()
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    await fixture.send(session.id)
    const command = runner.commands[0]
    if (command?.type !== 'turn')
      throw new Error('The turn command is missing.')
    const event = {
      type: 'assistant.delta' as const,
      sessionId: session.id,
      turnId: command.turnId,
      messageId: 'answer',
    }
    runner.emit({ ...event, text: 'Durable' })
    await fixture.drain()
    const tab = await fixture.tab()
    const received = structuredClone(runner.received)
    const read = () =>
      fixture.chat.store.read(WORKSPACE_ID, async (view) => ({
        cursor: await view.cursor('fake-stream-1'),
        started: (await view.turn(command.turnId))?.started,
        text: (await view.history(0)).events.flatMap(({ event }) =>
          event.type === 'assistant.delta' ? [event.text] : [],
        ),
      }))
    const verifyReplay = async (liveText: readonly string[]) => {
      const resumed = await fixture.tab()
      await fixture.connect(runner)
      expect(runner.pendingEvents()).toEqual([])
      expect(await read()).toEqual({
        cursor: 3,
        started: true,
        text: ['Durable', ' after failure'],
      })
      expect(
        resumed.messages.flatMap((message) =>
          message.type === 'event' &&
          message.envelope.event.type === 'assistant.delta'
            ? [message.envelope.event.text]
            : [],
        ),
      ).toEqual(liveText)
      resumed.close()
    }
    return {
      storage: fixture.storage,
      action: async (error) => {
        runner.emit({ ...event, text: ' after failure' })
        await expect(fixture.drain()).rejects.toThrow(error)
      },
      read,
      before: { cursor: 2, started: true, text: ['Durable'] },
      after: { cursor: 3, started: true, text: ['Durable', ' after failure'] },
      unpublished: () => {
        expect(tab.messages).toHaveLength(1)
        expect(runner.received).toEqual(received)
        tab.close()
      },
      restart: () => fixture.restart(),
      verify: {
        rejected: () => verifyReplay([' after failure']),
        committed: () => verifyReplay([]),
      },
    }
  })
})
