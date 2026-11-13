import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { duringTurn, turn } from '../test-support/harness'
import type { FakeProvider } from '../test-support/providers'
import { BACKGROUND_WORK_LIMIT_MS as LIMIT } from './engine-background'
import type { ProviderProcess } from '../sdk-helper/src/providers/types'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(100)
})
afterEach(() => vi.useRealTimers())

function waiting(provider: FakeProvider) {
  provider.emit({ type: 'background', live: true, idle: false })
  provider.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  provider.emit({ type: 'activity', idle: true })
}

function message() {
  const input = duringTurn(turn('2'))
  input.turnId = 'turn-1'
  input.message.choice = {
    agent: 'claude',
    model: 'next-model',
    effort: 'max',
    fast: false,
  }
  return input
}

it('starts deferred input during a wait without needing another result from the idle provider', async () => {
  const h = await engineFixture({ now: () => Date.now() })
  await h.engine.command(turn())
  const first = h.providers.latest
  waiting(first)
  await h.engine.idle()
  expect(first.closed).toBe(false)
  const process: ProviderProcess = first
  vi.spyOn(process, 'model').mockResolvedValue('deferred')
  await h.engine.command(message())
  expect(h.providers.processes).toHaveLength(2)
  expect(first.closed).toBe(true)
  expect(h.providers.latest.messages.map(({ message }) => message.id)).toEqual([
    'message-2',
  ])
  expect(h.providers.latest.options.credential).toEqual(
    first.options.credential,
  )
  expect(h.events.map(({ type }) => type)).toEqual(['turn.started'])
})

it('keeps the deadline across a deferred provider handoff after wake-up work', async () => {
  const h = await engineFixture({ now: () => Date.now() })
  await h.engine.command(turn())
  const first = h.providers.latest
  waiting(first)
  await h.engine.idle()
  expect(first.closed).toBe(false)
  await vi.advanceTimersByTimeAsync(1000)
  first.emit({ type: 'activity', idle: false })
  await h.engine.idle()
  const process: ProviderProcess = first
  vi.spyOn(process, 'model').mockResolvedValue('deferred')
  await h.engine.command(message())
  first.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.engine.idle()
  expect(h.providers.processes).toHaveLength(2)
  const second = h.providers.latest
  await vi.advanceTimersByTimeAsync(LIMIT - 1000)
  await h.engine.idle()
  expect(h.events.map(({ type }) => type)).toEqual(['turn.started'])
  second.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-2'],
  })
  await h.engine.idle()
  expect(h.events.at(-1)).toEqual({
    type: 'turn.completed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    state: 'finished',
    durationMs: LIMIT,
    files: [],
    endReason: 'background_work_limit',
    omittedFileCount: 0,
    userMessageIds: ['message-1', 'message-2'],
  })
  expect(first.closed).toBe(true)
  expect(second.closed).toBe(true)
  expect(h.warnings).toEqual([])
})
