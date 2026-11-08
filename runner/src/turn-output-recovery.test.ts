import { expect, it, vi } from 'vitest'

import { turn } from '../test-support/harness'
import { stop } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { mapTool } from './providers/tool'
import { EventStore } from './state'

it.each(['Stop', 'shutdown'])(
  'saves every buffered message and tool stop after a failed text save during %s',
  async (ending) => {
    const h = await wireFixture()
    await h.runner.start(false)
    h.endpoint.confirmEvents = false
    const command = turn()
    h.endpoint.send(command)
    await h.runner.idle()
    const provider = h.providers.latest
    for (const id of ['first-tool', 'second-tool'])
      provider.emit({
        type: 'tool',
        tool: mapTool(id, 'Read', { path: id }, 'running'),
      })
    await h.runner.idle()
    const write = h.storage.write.bind(h.storage)
    let rejected = 0
    vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
      if (
        rejected === 0 &&
        state.outbox.at(-1)?.event.type === 'assistant.delta'
      ) {
        rejected++
        throw new Error('The first buffered text cannot be saved.')
      }
      await write(state)
    })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      provider.emit({
        type: 'delta',
        messageId: 'first',
        text: 'First buffered text.',
      })
      provider.emit({
        type: 'delta',
        messageId: 'second',
        text: 'Second buffered text.',
      })
      await h.runner.engine.command({
        type: 'model',
        commandId: 'buffer-barrier',
        sessionId: command.sessionId,
        choice: command.message.choice,
      })
      if (ending === 'Stop')
        await h.runner.engine.command(stop(command.sessionId, command.turnId))
      else await h.runner.close()
      await h.runner.link.idle()
      const saved = (await EventStore.open(h.storage)).snapshot
      expect(rejected).toBe(1)
      expect
        .soft(
          saved.outbox.flatMap(({ event }) =>
            event.type === 'assistant.delta'
              ? [[event.messageId, event.text]]
              : [],
          ),
        )
        .toEqual([
          ['first', 'First buffered text.'],
          ['second', 'Second buffered text.'],
        ])
      expect
        .soft(
          saved.outbox.flatMap(({ event }) =>
            event.type === 'tool.updated'
              ? [[event.tool.id, event.tool.state]]
              : [],
          ),
        )
        .toEqual([
          ['first-tool', 'running'],
          ['second-tool', 'running'],
          ['first-tool', 'stopped'],
          ['second-tool', 'stopped'],
        ])
      expect(
        saved.outbox.flatMap(({ event }) =>
          event.type === 'turn.completed' || event.type === 'turn.failed'
            ? [event]
            : [],
        ),
      ).toEqual([
        {
          type: 'turn.completed',
          sessionId: 'session-1',
          turnId: 'turn-1',
          state: 'stopped',
          durationMs: 0,
          files: [],
          ...(ending === 'Stop' ? { filesUnavailable: true } : {}),
          omittedFileCount: 0,
          userMessageIds: ['message-1'],
        },
      ])
      expect(provider.closed).toBe(true)
      expect(h.warnings).toEqual(['The final agent output could not be saved.'])
    } finally {
      vi.useRealTimers()
    }
  },
)
