import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { duringTurn, turn } from '../test-support/harness'
import { deferred, stop } from '../test-support/runtime'
import type { ProviderProcess } from './providers/types'

it('waits for a deferred model close before Stop or shutdown ends the turn', async () => {
  for (const action of ['Stop', 'shutdown'] as const) {
    const h = await engineFixture()
    await h.engine.command(turn())
    await h.engine.idle()
    const provider = h.providers.latest
    const process: ProviderProcess = provider
    vi.spyOn(process, 'model').mockResolvedValue('deferred')
    const next = turn('bob', 'bob')
    next.message.choice = {
      agent: 'claude',
      model: 'next-model',
      effort: 'max',
      fast: false,
    }
    await h.engine.command({
      ...duringTurn(next),
      type: 'message',
      turnId: 'turn-1',
    })
    const entered = deferred<void>()
    const release = deferred<void>()
    vi.spyOn(provider, 'close').mockImplementation(async () => {
      entered.resolve()
      await release.promise
      provider.closed = true
    })
    const closedAtEnd: boolean[] = []
    const emit = h.options.emit
    vi.spyOn(h.options, 'emit').mockImplementation(async (event) => {
      if (event.type === 'turn.completed' || event.type === 'turn.failed')
        closedAtEnd.push(provider.closed)
      await emit(event)
    })
    provider.emit({
      type: 'result',
      state: 'finished',
      userMessageIds: ['message-1'],
    })
    await entered.promise
    vi.useFakeTimers()
    let returned = false
    const ending = (
      action === 'Stop'
        ? h.engine.command(stop('session-1', 'turn-1'))
        : h.engine.close()
    ).then(() => {
      returned = true
    })
    try {
      await vi.runAllTimersAsync()
      expect({ action, closedAtEnd, returned }).toEqual({
        action,
        closedAtEnd: [],
        returned: false,
      })
      expect(provider.closed).toBe(false)
    } finally {
      release.resolve()
      await ending
      vi.useRealTimers()
    }
    expect(provider.closed).toBe(true)
    expect(closedAtEnd).toEqual([true])
    expect(h.providers.processes).toHaveLength(1)
    expect(h.events).toEqual([
      {
        type: 'turn.started',
        sessionId: 'session-1',
        turnId: 'turn-1',
        senderId: 'alice',
        choice: {
          agent: 'claude',
          model: 'test-model',
          effort: 'high',
          fast: false,
        },
        startedAt: 100,
        messageIds: ['message-1'],
      },
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
    expect(
      h.store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
    ).toEqual([2])
    expect(h.warnings).toEqual([])
  }
})
