import { expect, it, vi } from 'vitest'

import { turn } from '../test-support/harness'
import { deferred, stop } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'

it('keeps the first end when Stop and shutdown cross a pending terminal save', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.endpoint.confirmEvents = false
  h.endpoint.send(turn())
  await h.runner.idle()
  const provider = h.providers.latest
  const entered = deferred<void>()
  const release = deferred<void>()
  const write = h.storage.write.bind(h.storage)
  let held = false
  vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
    if (!held && state.outbox.at(-1)?.event.type === 'turn.completed') {
      held = true
      entered.resolve()
      await release.promise
    }
    await write(state)
  })
  provider.emit({ type: 'result', state: 'finished', userMessageIds: [] })
  await entered.promise
  try {
    expect(
      h.store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
    ).toEqual([null])
    const stopped = h.runner.engine.command(stop('session-1', 'turn-1'))
    const closing = h.runner.close()
    const repeated = h.runner.engine.command(
      stop('session-1', 'turn-1', 'again'),
    )
    provider.emit({ type: 'failed', code: 'late', message: 'Late failure.' })
    expect(
      h.endpoint.runnerEvents.filter(
        ({ event }) => event.type === 'turn.completed',
      ),
    ).toEqual([])
    release.resolve()
    await Promise.all([stopped, closing, repeated])
    expect(provider.closed).toBe(true)
    expect(
      h.endpoint.runnerEvents.flatMap(({ event }) =>
        event.type === 'turn.completed' || event.type === 'turn.failed'
          ? [event]
          : [],
      ),
    ).toEqual([
      {
        type: 'turn.completed',
        sessionId: 'session-1',
        turnId: 'turn-1',
        state: 'finished',
        durationMs: 0,
        files: [],
        omittedFileCount: 0,
        userMessageIds: ['message-1'],
      },
    ])
    expect(
      h.store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
    ).toEqual([5])
    expect(h.warnings).toEqual([])
  } finally {
    release.resolve()
    await h.runner.idle()
  }
})
