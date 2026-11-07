import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { deferred, sessionTurn, stop } from '../test-support/runtime'

it('keeps idle model changes local and applies them inside the next cancelable turn', async () => {
  const h = await engineFixture()
  await h.engine.command(sessionTurn('model'))
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: [],
  })
  await h.engine.idle()
  const provider = h.providers.latest
  const choice = {
    agent: 'claude' as const,
    model: 'next-model',
    effort: 'medium' as const,
  }
  await h.engine.command({
    type: 'model',
    commandId: 'idle-model',
    sessionId: 'model',
    choice,
  })
  expect(provider.choices).toEqual([])
  const next = sessionTurn('model', 'next-model')
  next.message.choice = choice
  await h.engine.command(next)
  expect(provider.choices).toEqual([choice])
  expect(provider.messages.map((command) => command.message.id)).toEqual([
    'message-model',
    'message-next-model',
  ])
  expect(h.warnings).toEqual([])
})

it('stops a turn during its own session save and closes idle agents without a late start or duplicate end', async () => {
  const h = await engineFixture()
  const entered = deferred<void>()
  const release = deferred<void>()
  const remember = h.store.remember.bind(h.store)
  vi.spyOn(h.store, 'remember').mockImplementation(async (session) => {
    if (session.sessionId === 'saving') {
      entered.resolve()
      await release.promise
    }
    await remember(session)
  })
  const starting = h.engine.command(sessionTurn('saving'))
  await entered.promise
  try {
    const stopped = h.engine.command(stop('saving'))
    const repeated = h.engine.command(stop('saving', 'turn-saving', 'repeated'))
    expect(h.events).toEqual([
      {
        type: 'turn.completed',
        sessionId: 'saving',
        turnId: 'turn-saving',
        state: 'stopped',
        durationMs: 0,
        files: [],
        omittedFileCount: 0,
        userMessageIds: [],
      },
    ])
    await Promise.all([starting, stopped, repeated])
    expect(h.providers.processes).toEqual([])
    expect(h.store.snapshot.turns).toEqual([])
  } finally {
    release.resolve()
    await starting
  }
  await h.engine.command({
    ...sessionTurn('saving'),
    commandId: 'replayed-stopped-start',
  })
  expect(h.events).toHaveLength(1)
  await h.engine.command(sessionTurn('saving', 'working'))
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: [],
  })
  await h.engine.idle()
  const idle = h.providers.latest
  const before = h.events.length
  const pending = h.engine.command(sessionTurn('saving', 'pending'))
  const stopped = h.engine.command(stop('saving', 'turn-pending'))
  await Promise.all([pending, stopped])
  expect(idle.closed).toBe(true)
  expect(h.events.slice(before).map((event) => event.type)).toEqual([
    'turn.completed',
  ])
  await h.engine.command(stop('saving', 'turn-pending', 'another'))
  expect(h.events).toHaveLength(before + 1)
  expect(h.providers.processes).toHaveLength(1)
  await h.engine.command(sessionTurn('saving', 'active'))
  const active = h.providers.latest
  const other = h.engine.command(sessionTurn('saving', 'other'))
  const canceled = h.engine.command(stop('saving', 'turn-other'))
  await Promise.all([other, canceled])
  expect(active.closed).toBe(false)
  expect(active.messages.map((command) => command.message.id)).toEqual([
    'message-active',
  ])
  active.emit({ type: 'result', state: 'finished', userMessageIds: [] })
  await h.engine.idle()
  expect(h.events.slice(-3).map((event) => [event.type, event.turnId])).toEqual(
    [
      ['turn.started', 'turn-active'],
      ['turn.completed', 'turn-other'],
      ['turn.completed', 'turn-active'],
    ],
  )
  expect(h.warnings).toEqual([])
})
