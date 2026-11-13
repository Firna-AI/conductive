import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeClaudeQuery } from '../../test-support/claude-query'
import { checkClaudeFailures } from '../../test-support/claude-failures'
import {
  fakeComputerServer,
  mockComputerServer,
} from '../../test-support/computer-mcp'
import { duringTurn, runnerHarness, turn } from '../../../test-support/harness'
import { string } from '../parse'
import { Runner } from '../../../src/runner'
import { createClaudeFactory } from './claude'

beforeEach(mockComputerServer)

it('maps SDK partial text, thinking, tools, message UUIDs, and stopped output', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  vi.stubEnv('ANTHROPIC_API_KEY', 'another-account')
  onTestFinished(() => {
    vi.unstubAllEnvs()
  })
  let sdk = new FakeClaudeQuery()
  const runner = new Runner({
    ...h.options,
    providers: {
      ...h.options.providers,
      claude: createClaudeFactory(
        (parameters) => {
          if (sdk.closed) sdk = new FakeClaudeQuery()
          return sdk.open(parameters)
        },
        () => '/pinned/sdk/claude',
      ),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  h.endpoint.send(turn())
  await runner.idle()
  const first = await sdk.nextUser()
  const uuid1 = string(first.uuid)
  h.endpoint.send({
    ...duringTurn(turn('2')),
    type: 'message',
    turnId: 'turn-1',
  })
  await runner.idle()
  const second = await sdk.nextUser()
  const uuid2 = string(second.uuid)
  expect(first.priority).toBe('next')
  const sdkOptions = sdk.parameters?.options
  const providerEnv = sdkOptions?.env ?? {}
  expect({
    pathToClaudeCodeExecutable: sdkOptions?.pathToClaudeCodeExecutable,
    includePartialMessages: sdkOptions?.includePartialMessages,
    persistSession: sdkOptions?.persistSession,
    mcpServers: sdkOptions?.mcpServers,
  }).toMatchObject({
    pathToClaudeCodeExecutable: '/pinned/sdk/claude',
    includePartialMessages: true,
    persistSession: true,
    mcpServers: { computer: fakeComputerServer },
  })
  expect(providerEnv.CLAUDE_CONFIG_DIR).toBe(`${h.home}/.conductive/claude`)
  expect(Object.hasOwn(providerEnv, 'ANTHROPIC_API_KEY')).toBe(false)
  expect(Object.hasOwn(providerEnv, 'CLAUDE_CODE_OAUTH_TOKEN')).toBe(false)
  await sdk.raw({ type: 'system', subtype: 'init', session_id: 'sdk-session' })
  await sdk.raw({
    type: 'system',
    subtype: 'thinking_tokens',
    thinking_tokens: 32,
  })
  await sdk.raw({
    type: 'stream_event',
    user_message_uuids: [uuid1, uuid2],
    event: { type: 'message_start', message: { id: 'sdk-answer' } },
  })
  await sdk.raw({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'Part ' },
    },
  })
  await sdk.raw({
    type: 'stream_event',
    event: {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: 'two' },
    },
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.map((item) => item.event)).toContainEqual({
    type: 'assistant.delta',
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'sdk-answer',
    text: 'Part t',
  })
  await sdk.raw({
    type: 'assistant',
    message: {
      id: 'tool-answer',
      content: [
        {
          type: 'tool_use',
          id: 'sdk-tool',
          name: 'Read',
          input: { file_path: 'README.md' },
        },
      ],
    },
  })
  await sdk.raw({
    type: 'assistant',
    message: {
      id: 'synthetic',
      content: [{ type: 'text', text: '[Request interrupted by user]' }],
    },
  })
  await sdk.raw({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: 'sdk-tool' }] },
  })
  await sdk.raw({
    type: 'assistant',
    user_message_uuids: [uuid1, uuid2],
    message: {
      id: 'sdk-answer',
      content: [
        { type: 'text', text: 'Part ' },
        { type: 'text', text: 'two' },
      ],
    },
  })
  h.endpoint.send({
    type: 'model',
    commandId: 'model',
    sessionId: 'session-1',
    choice: { agent: 'claude', model: 'new-model', effort: 'max' },
  })
  await runner.idle()
  h.endpoint.send({
    type: 'interrupt',
    commandId: 'stop',
    sessionId: 'session-1',
    turnId: 'turn-1',
  })
  await runner.idle()
  expect(sdk.models.at(-1)).toBe('new-model')
  expect(sdk.efforts.at(-1)).toEqual({ effortLevel: 'max', ultracode: false })
  expect(sdk.interrupts).toBe(0)
  expect(sdk.closed).toBe(true)
  await runner.idle()
  const events = h.endpoint.runnerEvents.map((item) => item.event)
  expect(events).toContainEqual({
    type: 'turn.thinking',
    sessionId: 'session-1',
    turnId: 'turn-1',
  })
  expect(events).toContainEqual({
    type: 'assistant.completed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'sdk-answer',
    text: 'Part two',
    userMessageIds: ['message-1', 'message-2'],
  })
  expect(
    events.flatMap((event) =>
      event.type === 'assistant.delta' && event.messageId === 'sdk-answer'
        ? [event.text]
        : [],
    ),
  ).toEqual(['Part t', 'wo'])
  expect(events).toContainEqual({
    type: 'tool.updated',
    sessionId: 'session-1',
    turnId: 'turn-1',
    tool: {
      id: 'sdk-tool',
      kind: 'read',
      target: 'README.md',
      detail: null,
      omittedDetailBytes: 0,
      state: 'done',
    },
  })
  expect(JSON.stringify(events)).not.toContain('Request interrupted')
  expect(events.at(-1)).toMatchObject({
    type: 'turn.completed',
    state: 'stopped',
  })
  expect(h.store.snapshot.sessions).toEqual([
    {
      sessionId: 'session-1',
      agent: 'claude',
      providerSessionId: 'sdk-session',
      instructions: sdkOptions?.systemPrompt,
      instructionBranches: null,
    },
  ])
  h.endpoint.send(turn('3'))
  await runner.idle()
  expect(sdk.parameters?.options?.resume).toBe('sdk-session')
  const thirdUuid = string((await sdk.nextUser()).uuid)
  const fourth = turn('4')
  fourth.message.choice = {
    agent: 'claude',
    model: 'follow-up-model',
    effort: 'medium',
  }
  h.endpoint.send({ ...duringTurn(fourth), type: 'message', turnId: 'turn-3' })
  await runner.idle()
  const fourthUuid = string((await sdk.nextUser()).uuid)
  expect(sdk.models.at(-1)).toBe('follow-up-model')
  expect(sdk.efforts.at(-1)).toEqual({
    effortLevel: 'medium',
    ultracode: false,
  })
  await sdk.raw({
    type: 'assistant',
    user_message_uuids: [thirdUuid],
    message: {
      id: 'first-text-only',
      content: [{ type: 'text', text: 'First reply.' }],
    },
  })
  await sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [thirdUuid],
  })
  await runner.idle()
  expect(
    h.endpoint.runnerEvents.filter(
      (item) =>
        item.event.type === 'turn.completed' && item.event.turnId === 'turn-3',
    ),
  ).toEqual([])
  await sdk.raw({
    type: 'assistant',
    user_message_uuids: [fourthUuid],
    message: {
      id: 'queued-text-only',
      content: [{ type: 'text', text: 'Queued reply.' }],
    },
  })
  await sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [fourthUuid],
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-3',
    state: 'finished',
    userMessageIds: ['message-3', 'message-4'],
  })
  expect(h.endpoint.runnerEvents.map((item) => item.event)).toContainEqual({
    type: 'assistant.completed',
    sessionId: 'session-1',
    turnId: 'turn-3',
    messageId: 'queued-text-only',
    text: 'Queued reply.',
    userMessageIds: ['message-4'],
  })
  h.endpoint.send(turn('5'))
  await runner.idle()
  const fifthUuid = string((await sdk.nextUser()).uuid)
  await sdk.raw({
    type: 'result',
    is_error: true,
    user_message_uuids: [fifthUuid],
    errors: ['Authentication failed: invalid API key secret-alice'],
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: {
      code: 'agent_authentication_failed',
      message: 'The agent login failed. Reconnect your agent account.',
    },
  })
  await checkClaudeFailures(runner, h.endpoint, () => sdk, h.root, h.home)
})
