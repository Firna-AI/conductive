import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { runnerHarness, turn } from '../../../test-support/harness'
import { string } from '../parse'
import { Runner } from '../../../src/runner'
import { createClaudeFactory } from './claude'
import { ClaudeEvents } from './claude-events'
import type { ProviderEvent } from '../generated/ProviderEvent'

beforeEach(mockComputerServer)

it('keeps a resumed Claude turn open for its real answer after a background result', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  await h.store.remember({
    sessionId: 'session-1',
    agent: 'claude',
    providerSessionId: 'saved-sdk-session',
  })
  const sdk = new FakeClaudeQuery()
  const runner = new Runner({
    ...h.options,
    providers: {
      ...h.options.providers,
      claude: createClaudeFactory(sdk.open, () => '/pinned/claude'),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  const command = turn()
  command.message.text = 'can you reach the internet?'
  h.endpoint.send(command)
  await runner.idle()
  const uuid = string((await sdk.nextUser()).uuid)
  expect(sdk.parameters?.options?.resume).toBe('saved-sdk-session')
  await sdk.raw({
    type: 'system',
    subtype: 'task_notification',
    task_id: 'old-task',
    status: 'failed',
    summary: 'The old background command stopped.',
  })
  await sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 0,
    result: '',
    origin: { kind: 'task-notification' },
    user_message_uuids: [],
  })
  await runner.idle()
  const ends = () =>
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'turn.completed' || event.type === 'turn.failed'
        ? [event]
        : [],
    )
  expect(ends()).toEqual([])
  expect(sdk.closed).toBe(false)
  await sdk.raw({
    type: 'stream_event',
    user_message_uuid: uuid,
    event: { type: 'message_start', message: { id: 'internet-answer' } },
  })
  await sdk.raw({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'The internet is reachable.' },
    },
  })
  await runner.idle()
  expect(
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'assistant.delta' ? [event.text] : [],
    ),
  ).toEqual(['The internet is reachable.'])
  expect(ends()).toEqual([])
  expect(sdk.closed).toBe(false)
  await sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    user_message_uuid: uuid,
  })
  await runner.idle()
  expect(
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'assistant.completed' ? [event] : [],
    ),
  ).toEqual([
    {
      type: 'assistant.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      messageId: 'internet-answer',
      text: 'The internet is reachable.',
      userMessageIds: ['message-1'],
    },
  ])
  expect(ends()).toEqual([
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
  expect(sdk.closed).toBe(true)
  expect(h.warnings).toEqual([])
})

it('keeps an in-progress Claude answer and its user association across a background result', () => {
  const events: ProviderEvent[] = []
  const mapper = new ClaudeEvents(
    new Map([
      ['current-sdk-uuid', 'message-current'],
      ['old-sdk-uuid', 'message-old'],
    ]),
    (event) => events.push(event),
    (uuid) => uuid === 'current-sdk-uuid',
  )
  mapper.accept({
    type: 'stream_event',
    user_message_uuid: 'current-sdk-uuid',
    event: { type: 'message_start', message: { id: 'current-answer' } },
  })
  mapper.accept({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'First ' },
    },
  })
  mapper.accept({
    type: 'result',
    is_error: false,
    origin: { kind: 'task-notification' },
    user_message_uuid: 'old-sdk-uuid',
  })
  expect(events).toEqual([
    { type: 'delta', messageId: 'current-answer', text: 'First ' },
  ])
  mapper.accept({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'reply.' },
    },
  })
  mapper.accept({
    type: 'result',
    is_error: false,
    origin: { kind: 'task-notification' },
    user_message_uuid: 'current-sdk-uuid',
  })
  expect(events).toEqual([
    { type: 'delta', messageId: 'current-answer', text: 'First ' },
    { type: 'delta', messageId: 'current-answer', text: 'reply.' },
    {
      type: 'answer',
      messageId: 'current-answer',
      text: 'First reply.',
      userMessageIds: ['message-current'],
    },
    {
      type: 'result',
      state: 'finished',
      userMessageIds: ['message-current'],
    },
  ])
})
