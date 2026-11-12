import { expect, it, vi } from 'vitest'

import { backgroundFixture } from '../test-support/background'
import { duringTurn, turn } from '../test-support/harness'
import { deferred } from '../test-support/runtime'

it('resets a wait from member receipt and keeps notification results separate from member acknowledgements', async () => {
  const h = await backgroundFixture()
  await h.wait()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(1000)
  const entered = deferred<void>()
  const release = deferred<void>()
  const held = vi.spyOn(h.sdk, 'setModel').mockImplementationOnce(async () => {
    entered.resolve()
    await release.promise
  })
  const model = h.engine.command({
    type: 'model',
    commandId: 'model',
    sessionId: 'session-1',
    choice: { agent: 'claude', model: 'next', effort: 'max', fast: false },
  })
  await entered.promise
  const message = h.engine.command({
    ...duringTurn(turn('2')),
    turnId: 'turn-1',
  })
  await vi.advanceTimersByTimeAsync(1000)
  release.resolve()
  await Promise.all([model, message])
  held.mockRestore()
  const next = await h.sdk.nextUser()
  await h.raw({
    type: 'stream_event',
    user_message_uuid: next.uuid,
    event: { type: 'message_start', message: { id: 'member-answer' } },
  })
  await h.raw({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Member ' },
    },
  })
  await h.wake()
  expect(h.ends()).toEqual([])
  expect(
    h.events.filter((event) => event.type === 'assistant.completed'),
  ).toEqual([])
  await h.raw({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'reply.' },
    },
  })
  await h.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [next.uuid],
  })
  expect(
    h.events.filter((event) => event.type === 'assistant.completed'),
  ).toEqual([
    {
      type: 'assistant.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      messageId: 'member-answer',
      text: 'Member reply.',
      userMessageIds: ['message-2'],
    },
  ])
  await h.state('idle')
  await vi.advanceTimersByTimeAsync(7198999)
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
      durationMs: 7201000,
      files: [],
      endReason: 'background_work_limit',
      omittedFileCount: 0,
      userMessageIds: ['message-1', 'message-2'],
    },
  ])
  expect(h.removed).toHaveBeenCalledTimes(1)
})

it('does not reset the count for a member message during active wake-up work', async () => {
  const h = await backgroundFixture()
  await h.wait()
  expect(h.ends()).toEqual([])
  await vi.advanceTimersByTimeAsync(1000)
  await h.state('running')
  await h.engine.command({ ...duringTurn(turn('2')), turnId: 'turn-1' })
  const next = await h.sdk.nextUser()
  await h.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [next.uuid],
  })
  await h.state('idle')
  await vi.advanceTimersByTimeAsync(7198999)
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
      userMessageIds: ['message-1', 'message-2'],
    },
  ])
})
