import { expect } from 'vitest'

import type { Runner } from '../../src/runner'
import type { FakeDurableObjectEndpoint } from '../../../worker/test-support/fake-durable-object'
import { createClaudeFactory } from '../src/providers/claude'
import type { ProviderEvent } from '../src/generated/ProviderEvent'
import { string } from '../../src/parse'
import { FakeClaudeQuery } from './claude-query'
import { turn } from '../../test-support/harness'
import { fakeToolContext } from '../../test-support/providers'

export async function checkClaudeFailures(
  runner: Runner,
  endpoint: FakeDurableObjectEndpoint,
  current: () => FakeClaudeQuery,
  root: string,
  home: string,
): Promise<void> {
  endpoint.send(turn('6'))
  await runner.idle()
  let sdk = current()
  let uuid = string((await sdk.nextUser()).uuid)
  await sdk.raw({
    type: 'assistant',
    error: 'authentication_failed',
    user_message_uuids: [uuid],
    message: {
      id: 'revoked-api-error',
      content: [
        { type: 'text', text: 'OAuth token revoked · Please run /login' },
      ],
    },
  })
  await sdk.raw({
    type: 'assistant',
    error: 'billing_error',
    parent_tool_use_id: 'child-tool',
    message: {
      id: 'child-error',
      content: [{ type: 'text', text: 'Child error' }],
    },
  })
  await sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: true,
    result: 'OAuth token revoked · Please run /login',
    user_message_uuids: [uuid],
  })
  await runner.idle()
  expect(endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: {
      code: 'agent_authentication_failed',
      message: 'The agent login failed. Reconnect your agent account.',
    },
  })
  expect(
    endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'assistant.completed' &&
      event.messageId === 'revoked-api-error'
        ? [event.text]
        : [],
    ),
  ).toEqual([])

  endpoint.send(turn('7'))
  await runner.idle()
  sdk = current()
  uuid = string((await sdk.nextUser()).uuid)
  await sdk.raw({
    type: 'assistant',
    error: 'max_output_tokens',
    user_message_uuids: [uuid],
    message: {
      id: 'other-api-error',
      content: [
        { type: 'text', text: 'Please switch to Sonnet for this request.' },
      ],
    },
  })
  await sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: true,
    result: 'Please switch to Sonnet for this request.',
    user_message_uuids: [uuid],
  })
  await runner.idle()
  expect(endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: {
      code: 'agent_failed',
      message: 'Please switch to Sonnet for this request.',
    },
  })
  expect(
    endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'assistant.completed' &&
      event.messageId === 'other-api-error'
        ? [event.text]
        : [],
    ),
  ).toEqual([])

  endpoint.send(turn('8'))
  await runner.idle()
  sdk = current()
  uuid = string((await sdk.nextUser()).uuid)
  await sdk.raw({
    type: 'assistant',
    user_message_uuids: [uuid],
    message: {
      id: 'genuine-answer',
      content: [
        { type: 'text', text: 'The application can show an API error.' },
      ],
    },
  })
  await sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: 'The application can show an API error.',
    user_message_uuids: [uuid],
  })
  await runner.idle()
  expect(endpoint.runnerEvents.map(({ event }) => event)).toContainEqual({
    type: 'assistant.completed',
    sessionId: 'session-1',
    turnId: 'turn-8',
    messageId: 'genuine-answer',
    text: 'The application can show an API error.',
    userMessageIds: ['message-8'],
  })
  endpoint.send(turn('9'))
  await runner.idle()
  sdk = current()
  uuid = string((await sdk.nextUser()).uuid)
  await sdk.raw({
    type: 'result',
    subtype: 'error_max_turns',
    is_error: false,
    errors: ['The turn reached its configured turn count.'],
    user_message_uuids: [uuid],
  })
  await runner.idle()
  expect(endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: {
      code: 'agent_failed',
      message: 'The turn reached its configured turn count.',
    },
  })

  const query = new FakeClaudeQuery()
  const events: ProviderEvent[] = []
  const provider = await createClaudeFactory(
    query.open,
    () => '/pinned/sdk/claude',
  )({
    cwd: root,
    home,
    sessionId: turn().sessionId,
    endpoint: 'https://machines.conductive.test/v1/model/claude',
    credential: { type: 'gateway', ...turn().credential },
    commitAuthor: null,
    choice: turn().message.choice,
    conversationId: null,
    instructions: '',
    tools: fakeToolContext,
    event: (event) => {
      events.push(event)
    },
    warn: () => {},
  })
  try {
    await provider.interrupt()
    await query.raw({
      type: 'assistant',
      error: 'authentication_failed',
      message: {
        id: 'stopped-api-error',
        content: [{ type: 'text', text: 'OAuth token revoked' }],
      },
    })
    await query.raw({
      type: 'result',
      subtype: 'success',
      is_error: true,
      result: 'OAuth token revoked',
    })
    expect(events).toEqual([
      { type: 'result', state: 'stopped', userMessageIds: [] },
    ])
  } finally {
    await provider.close()
  }
}
