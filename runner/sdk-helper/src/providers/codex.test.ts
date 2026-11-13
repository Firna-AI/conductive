import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeAppServers } from '../../test-support/app-server'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { duringTurn, runnerHarness, turn } from '../../../test-support/harness'
import { Runner } from '../../../src/runner'
import { createCodexFactory } from './codex'

beforeEach(mockComputerServer)

it('streams App Server partial text and sends steer, model, and interrupt controls', async () => {
  const h = await runnerHarness()
  await h.runner.close()
  const servers = new FakeAppServers()
  const runner = new Runner({
    ...h.options,
    providers: {
      ...h.options.providers,
      codex: createCodexFactory(servers.start),
    },
  })
  onTestFinished(() => runner.close())
  await runner.start(false)
  h.endpoint.send(turn('1', 'alice', 'codex'))
  await runner.idle()
  const server = servers.latest
  expect(Object.hasOwn(servers.requests[0].env, 'OPENAI_API_KEY')).toBe(false)
  expect(
    server.writes.find((write) => write.method === 'account/login/start'),
  ).toMatchObject({ params: { type: 'apiKey', apiKey: 'secret-alice' } })
  expect(servers.requests[0].args).toContain(
    'model_providers.conductive.requires_openai_auth=true',
  )
  expect(servers.requests[0].args).toContain(
    'cli_auth_credentials_store="ephemeral"',
  )
  expect(servers.requests[0].args).toContain(
    'mcp_servers.computer.command="/fake/platform/computer-server"',
  )
  expect(servers.requests[0].args).toContain(
    'mcp_servers.computer.args=["--socket","/run/test-computer.sock"]',
  )
  expect(JSON.stringify(servers.requests[0].args)).not.toContain('secret-alice')
  server.notify('item/agentMessage/delta', {
    itemId: 'codex-answer',
    delta: 'Hello ',
  })
  server.notify('item/agentMessage/delta', {
    itemId: 'codex-answer',
    delta: 'world',
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.map((item) => item.event)).toContainEqual({
    type: 'assistant.delta',
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'codex-answer',
    text: 'Hello world',
  })
  h.endpoint.send({
    ...duringTurn(turn('2', 'alice', 'codex')),
    type: 'message',
    turnId: 'turn-1',
  })
  await runner.idle()
  expect(
    server.writes.find((write) => write.method === 'turn/steer'),
  ).toMatchObject({
    params: {
      threadId: 'codex-conversation',
      expectedTurnId: 'codex-turn-1',
      clientUserMessageId: 'message-2',
    },
  })
  server.notify('item/started', {
    item: { id: 'command', type: 'commandExecution', command: 'npm test' },
  })
  server.notify('item/completed', {
    item: {
      id: 'command',
      type: 'commandExecution',
      command: 'npm test',
      status: 'completed',
    },
  })
  server.notify('item/completed', {
    item: { id: 'codex-answer', type: 'agentMessage', text: 'Hello world' },
  })
  server.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'completed' },
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.map((item) => item.event)).toContainEqual({
    type: 'assistant.completed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'codex-answer',
    text: 'Hello world',
    userMessageIds: ['message-1', 'message-2'],
  })
  expect(server.closed).toBe(true)
  const next = turn('3', 'alice', 'codex')
  next.message.choice = {
    agent: 'codex',
    model: 'next-model',
    effort: 'max',
    fast: false,
  }
  h.endpoint.send(next)
  await runner.idle()
  const nextServer = servers.latest
  expect(
    nextServer.writes.findLast((write) => write.method === 'turn/start'),
  ).toMatchObject({
    params: {
      model: 'next-model',
      effort: 'max',
      serviceTierForTurn: 'default',
    },
  })
  h.endpoint.send({
    type: 'interrupt',
    commandId: 'stop',
    sessionId: 'session-1',
    turnId: 'turn-3',
  })
  await runner.idle()
  expect(nextServer.closed).toBe(true)
  nextServer.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'interrupted' },
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    state: 'stopped',
  })
  h.endpoint.send(turn('4', 'bob', 'codex'))
  await runner.idle()
  expect(servers.processes).toHaveLength(3)
  expect(Object.hasOwn(servers.requests[2].env, 'OPENAI_API_KEY')).toBe(false)
  expect(
    servers.latest.writes.find(
      (write) => write.method === 'account/login/start',
    ),
  ).toMatchObject({ params: { type: 'apiKey', apiKey: 'secret-bob' } })
  expect(
    servers.latest.writes.find((write) => write.method === 'thread/resume'),
  ).toMatchObject({ params: { threadId: 'codex-conversation' } })
  expect(JSON.stringify(await h.storage.read())).not.toContain('secret-bob')
  const previous = servers.latest
  const fifth = turn('5', 'bob', 'codex')
  fifth.message.choice = {
    agent: 'codex',
    model: 'steered-model',
    effort: 'medium',
    fast: false,
  }
  h.endpoint.send({ ...duringTurn(fifth), type: 'message', turnId: 'turn-4' })
  const queuedChoice = turn('queued-choice', 'bob', 'codex')
  queuedChoice.message.choice = {
    agent: 'codex',
    model: 'second-steered-model',
    effort: 'high',
    fast: false,
  }
  h.endpoint.send({
    ...duringTurn(queuedChoice),
    type: 'message',
    turnId: 'turn-4',
  })
  await runner.idle()
  expect(
    previous.writes.filter((write) => write.method === 'turn/steer'),
  ).toEqual([])
  previous.notify('item/started', {
    item: { id: 'next-tool', type: 'commandExecution', command: 'npm test' },
  })
  await runner.idle()
  expect(
    previous.writes.find((write) => write.method === 'turn/interrupt'),
  ).toMatchObject({ params: { turnId: 'codex-turn-1' } })
  previous.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'interrupted' },
  })
  await runner.idle()
  expect(servers.processes).toHaveLength(4)
  expect(
    servers.latest.writes.find((write) => write.method === 'thread/resume'),
  ).toMatchObject({ params: { threadId: 'codex-conversation' } })
  expect(
    servers.latest.writes.find((write) => write.method === 'turn/start'),
  ).toMatchObject({
    params: {
      model: 'steered-model',
      effort: 'medium',
      clientUserMessageId: 'message-5',
    },
  })
  const firstChoice = servers.latest
  expect(
    firstChoice.writes.filter((write) => write.method === 'turn/steer'),
  ).toEqual([])
  firstChoice.notify('item/started', {
    item: { id: 'choice-tool', type: 'commandExecution', command: 'npm test' },
  })
  await runner.idle()
  firstChoice.notify('turn/completed', {
    turn: { id: 'codex-turn-1', status: 'interrupted' },
  })
  await runner.idle()
  expect(
    servers.latest.writes.find((write) => write.method === 'turn/start'),
  ).toMatchObject({
    params: {
      model: 'second-steered-model',
      effort: 'high',
      clientUserMessageId: 'message-queued-choice',
    },
  })
  servers.latest.notify('turn/completed', {
    turn: {
      id: 'codex-turn-1',
      status: 'failed',
      error: { message: 'Rate limit exceeded: secret-bob' },
    },
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: {
      code: 'agent_rate_limited',
      message: 'The agent reached its rate limit. Try again later.',
    },
  })
  h.endpoint.send(turn('6', 'bob', 'codex'))
  await runner.idle()
  h.endpoint.confirmEvents = false
  servers.latest.notify('turn/completed', {
    turn: {
      id: 'codex-turn-1',
      status: 'failed',
      error: { message: 'The service is unavailable for secret-bob.' },
    },
  })
  await runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: {
      code: 'agent_failed',
      message: 'The service is unavailable for [redacted].',
    },
  })
  expect(JSON.stringify(await h.storage.read())).not.toContain('secret-bob')
})
