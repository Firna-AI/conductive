import { expect, it, vi } from 'vitest'

import { backgroundFixture, clearTasks } from '../test-support/background'

it('ends a wait at 120 minutes with its files, duration, and end reason', async () => {
  const files = [
    { path: 'changed.ts', change: 'modified', added: 1, removed: 0 },
  ] as const
  const h = await backgroundFixture({ changedSince: async () => files })
  await h.wait()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(7199999)
  await h.engine.idle()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(1)
  await h.engine.idle()
  expect(h.ends()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 7200000,
      files,
      endReason: 'background_work_limit',
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
  expect(h.sdk.closed).toBe(true)
  expect(h.removed).toHaveBeenCalledTimes(1)
})

it('keeps the first deadline across wake-up work and repeated waits', async () => {
  const h = await backgroundFixture()
  await h.wait()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(3600000)
  await h.state('running')
  await vi.advanceTimersByTimeAsync(10000)
  await h.wake()
  await h.state('idle')
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(3589999)
  await h.engine.idle()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(1)
  await h.engine.idle()
  expect(h.ends()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 7200000,
      files: [],
      endReason: 'background_work_limit',
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
})

it('applies an elapsed limit after the reply even when the last task already ended', async () => {
  const h = await backgroundFixture()
  await h.wait()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(7199900)
  await h.state('running')
  await h.raw(clearTasks)
  await vi.advanceTimersByTimeAsync(200)
  await h.engine.idle()
  expect(h.ends()).toEqual([])
  expect(h.sdk.closed).toBe(false)
  await h.wake()
  expect(h.ends()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 7200100,
      files: [],
      endReason: 'background_work_limit',
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
})

it('keeps the limit reason when the final idle follows the deadline', async () => {
  const h = await backgroundFixture()
  await h.wait()
  await vi.advanceTimersByTimeAsync(7199900)
  await h.state('running')
  await h.raw(clearTasks)
  await h.wake()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(200)
  await h.engine.idle()
  expect(h.ends()).toEqual([])
  await h.state('idle')
  expect(h.ends()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 7200100,
      files: [],
      endReason: 'background_work_limit',
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
})

it('re-arms an early timer callback until the clock reaches the deadline', async () => {
  let now = 100
  const h = await backgroundFixture({ now: () => now })
  await h.wait()
  now = 7200099
  await vi.advanceTimersByTimeAsync(7200000)
  await h.engine.idle()
  expect(h.ends()).toEqual([])
  now = 7200100
  await vi.advanceTimersByTimeAsync(1)
  await h.engine.idle()
  expect(h.ends()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 7200000,
      files: [],
      endReason: 'background_work_limit',
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
})
