import { expect, it, vi } from 'vitest'

import { turn } from '../test-support/harness'
import { stop } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { mapTool } from './providers/tool'
import { EventStore } from './state'

it.each([1, 2])(
  'continues after %s failed saves of each agent output event and sends each event once',
  async (failedWrites) => {
    const h = await wireFixture()
    await h.runner.start(false)
    h.endpoint.confirmEvents = false
    h.endpoint.send(turn())
    await h.runner.idle()
    const provider = h.providers.latest
    const write = h.storage.write.bind(h.storage)
    const attempts = new Map<number, number>()
    vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
      const last = state.outbox.at(-1)
      if (
        last &&
        (last.event.type === 'turn.thinking' ||
          last.event.type === 'assistant.delta' ||
          last.event.type === 'assistant.completed' ||
          last.event.type === 'tool.updated')
      ) {
        const count = (attempts.get(last.eventNumber) ?? 0) + 1
        attempts.set(last.eventNumber, count)
        if (count <= failedWrites)
          throw new Error('The agent output cannot be saved.')
      }
      await write(state)
    })
    provider.emit({ type: 'thinking' })
    await h.runner.idle()
    provider.emit({ type: 'delta', messageId: 'answer', text: 'Live text.' })
    await h.runner.idle()
    provider.emit({
      type: 'answer',
      messageId: 'answer',
      text: 'Complete text.',
      userMessageIds: ['message-1'],
    })
    await h.runner.idle()
    provider.emit({
      type: 'tool',
      tool: mapTool('tool', 'Read', { path: 'file.txt' }, 'done'),
    })
    await h.runner.idle()
    expect([...attempts]).toEqual([
      [5, 2],
      [6, 2],
      [7, 2],
      [8, 2],
    ])
    expect(provider.closed).toBe(false)
    expect(
      h.endpoint.runnerEvents.slice(4).map(({ event }) => event.type),
    ).toEqual(
      failedWrites === 1
        ? [
            'turn.thinking',
            'assistant.delta',
            'assistant.completed',
            'tool.updated',
          ]
        : [],
    )
    expect(h.warnings).toEqual([
      'The agent output save failed. The turn will continue.',
      'The agent output save failed. The turn will continue.',
      'The agent output save failed. The turn will continue.',
      'The agent output save failed. The turn will continue.',
    ])
    provider.emit({ type: 'result', state: 'finished', userMessageIds: [] })
    await h.runner.idle()
    const saved = (await EventStore.open(h.storage)).snapshot
    expect(saved.outbox.map(({ eventNumber }) => eventNumber)).toEqual([
      4, 5, 6, 7, 8, 9,
    ])
    expect(h.endpoint.runnerEvents.slice(3)).toEqual(saved.outbox)
    expect(saved.outbox.map(({ event }) => event.type)).toEqual([
      'turn.started',
      'turn.thinking',
      'assistant.delta',
      'assistant.completed',
      'tool.updated',
      'turn.completed',
    ])
    expect(
      saved.outbox.flatMap(({ event }) =>
        event.type === 'assistant.delta' || event.type === 'assistant.completed'
          ? [[event.type, event.messageId, event.text]]
          : [],
      ),
    ).toEqual([
      ['assistant.delta', 'answer', 'Live text.'],
      ['assistant.completed', 'answer', 'Complete text.'],
    ])
    expect(saved.outbox.at(-1)?.event).toEqual({
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    })
    expect(provider.closed).toBe(true)
  },
)

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
          omittedFileCount: 0,
          userMessageIds: ['message-1'],
        },
      ])
      expect(provider.closed).toBe(true)
      expect(h.warnings).toEqual([
        'The agent output save failed. The turn will continue.',
      ])
    } finally {
      vi.useRealTimers()
    }
  },
)
