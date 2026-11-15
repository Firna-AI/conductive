import { expect, it, vi } from 'vitest'

import { backgroundFixture, clearTasks } from '../test-support/background'
import { stop } from '../test-support/runtime'
import { BACKGROUND_WORK_LIMIT_MS as LIMIT } from './engine-background'

it('keeps the same turn and credentials until a background notification reply becomes idle', async () => {
  const files = [
    { path: 'changed.ts', change: 'modified', added: 1, removed: 0 },
  ] as const
  const h = await backgroundFixture({ changedSince: async () => files })
  await h.wait()
  expect(h.ends()).toEqual([])
  expect(h.sdk.closed).toBe(false)
  expect(h.removed).toHaveBeenCalledTimes(0)
  expect(
    h.sdk.parameters?.options?.env?.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS,
  ).toBe('1')
  await h.raw(clearTasks)
  expect(h.ends()).toEqual([])
  await h.state('running')
  await h.raw({
    type: 'assistant',
    message: {
      id: 'wake-answer',
      content: [{ type: 'text', text: 'Checks passed.' }],
    },
  })
  await h.wake()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(2000)
  await h.state('idle')
  expect(
    h.events.filter((event) => event.type === 'assistant.completed'),
  ).toEqual([
    {
      type: 'assistant.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      messageId: 'wake-answer',
      text: 'Checks passed.',
      userMessageIds: [],
    },
  ])
  expect(h.ends()).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 2000,
      files,
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
  await h.engine.close()
  expect(h.removed).toHaveBeenCalledTimes(1)
  expect(h.warnings).toEqual([])
})

it('replaces the live task set and excludes ambient work without losing the idle boundary', async () => {
  const h = await backgroundFixture()
  await h.tasks()
  await h.result()
  expect(h.ends()).toEqual([])
  await h.state('idle')
  expect(h.ends()).toEqual([])
  await h.tasks()
  expect(h.ends()).toEqual([])
  await h.tasks(true)
  expect(h.ends()).toEqual([
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
})

it('finishes with only ambient work without opening a background wait', async () => {
  const h = await backgroundFixture()
  await h.tasks(true)
  await h.state('idle')
  await h.tasks(true)
  await h.result()
  expect(h.ends()).toEqual([
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
  await vi.advanceTimersByTimeAsync(LIMIT)
  await h.engine.idle()
  expect(h.ends()).toHaveLength(1)
  expect(h.sdk.closed).toBe(true)
})

it('keeps scheduled one-shot and recurring wake-ups until the Stop hook clears them', async () => {
  const h = await backgroundFixture()
  await h.stopHook([
    {
      id: 'once',
      schedule: '0 12 * * *',
      recurring: false,
      prompt: 'Read the result.',
    },
  ])
  await h.result()
  expect(h.ends()).toEqual([])
  await h.state('idle')
  expect(h.ends()).toEqual([])
  expect(h.sdk.closed).toBe(false)
  await h.state('running')
  await h.stopHook([
    {
      id: 'loop',
      schedule: '*/5 * * * *',
      recurring: true,
      prompt: 'Check again.',
    },
  ])
  await h.wake()
  await h.state('idle')
  expect(h.ends()).toEqual([])
  expect(h.sdk.closed).toBe(false)
  await h.stopHook([])
  expect(h.ends()).toEqual([])
  await h.state('running')
  await h.raw({
    type: 'assistant',
    message: {
      id: 'cron-answer',
      content: [{ type: 'text', text: 'The wake-up finished.' }],
    },
  })
  await h.wake()
  expect(h.ends()).toEqual([])
  await h.state('idle')
  expect(
    h.events.filter((event) => event.type === 'assistant.completed'),
  ).toEqual([
    {
      type: 'assistant.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      messageId: 'cron-answer',
      text: 'The wake-up finished.',
      userMessageIds: [],
    },
  ])
  expect(h.ends()).toHaveLength(1)
  expect(h.ends()[0]).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
  })
})

it('stops and shuts down a waiting turn once, after closing its credentials', async () => {
  for (const action of ['stop', 'shutdown'] as const) {
    const h = await backgroundFixture()
    await h.wait()
    expect(h.ends()).toEqual([])
    const close = vi.spyOn(h.sdk, 'close')
    if (action === 'stop') await h.engine.command(stop('session-1', 'turn-1'))
    else await h.engine.close()
    await h.engine.close()
    expect(close).toHaveBeenCalledTimes(1)
    expect(h.removed).toHaveBeenCalledTimes(1)
    expect(h.ends()).toEqual([
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
    await vi.advanceTimersByTimeAsync(LIMIT)
    expect(h.ends()).toHaveLength(1)
  }
})
