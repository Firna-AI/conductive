import { expect, it, onTestFinished } from 'vitest'

import { duringTurn, runnerHarness, turn } from '../test-support/harness'
import { Runner } from './runner'
import { EventStore } from './state'

it('delivers every member message on the running login and resumes stored conversation memory', async () => {
  const h = await runnerHarness()
  h.endpoint.send(turn())
  await h.runner.idle()
  const alice = h.providers.latest
  h.endpoint.send({
    ...duringTurn(turn('2', 'bob')),
    type: 'message',
    turnId: 'turn-1',
  })
  const queued = turn('queued', 'bob')
  queued.message.choice = {
    agent: 'claude',
    model: 'bob-model',
    effort: 'medium',
    fast: false,
  }
  h.endpoint.send({ ...duringTurn(queued), type: 'message', turnId: 'turn-1' })
  await h.runner.idle()
  expect(alice.messages.map((message) => message.message.id)).toEqual([
    'message-1',
    'message-2',
    'message-queued',
  ])
  expect(alice.messages.map(({ message }) => message.sender.id)).toEqual([
    'alice',
    'bob',
    'bob',
  ])
  alice.emit({
    type: 'tool',
    tool: {
      id: 'tool',
      kind: 'read',
      target: 'README.md',
      detail: null,
      omittedDetailBytes: 0,
      state: 'running',
    },
  })
  await h.runner.idle()
  expect(alice.interrupts).toBe(0)
  alice.emit({
    type: 'result',
    state: 'stopped',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  expect(h.providers.processes).toHaveLength(1)
  expect(alice.closed).toBe(false)
  expect(alice.options.credential).toEqual({
    type: 'gateway',
    agent: 'claude',
    kind: 'token',
    token: 'secret-alice',
  })
  expect(h.store.snapshot.sessions[0]?.providerSessionId).toBe('conversation-1')
  expect(alice.choices.at(-1)).toEqual({
    agent: 'claude',
    model: 'bob-model',
    effort: 'medium',
    fast: false,
  })
  alice.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-2', 'message-queued'],
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
    userMessageIds: ['message-1', 'message-2', 'message-queued'],
  })
  expect(alice.closed).toBe(true)
  const next = turn('3', 'bob')
  next.credential = turn().credential
  h.endpoint.send(next)
  await h.runner.idle()
  alice.emit({ type: 'delta', messageId: 'late', text: 'stale process output' })
  await h.runner.idle()
  expect(JSON.stringify(h.endpoint.events)).not.toContain(
    'stale process output',
  )
  expect(h.providers.processes).toHaveLength(2)
  expect(h.providers.latest.options.credential).toEqual({
    type: 'gateway',
    agent: 'claude',
    kind: 'token',
    token: 'secret-alice',
  })
  expect(h.providers.latest.options.conversationId).toBe('conversation-1')
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.started',
    senderId: 'bob',
    turnId: 'turn-3',
  })
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-3'],
  })
  await h.runner.idle()
  await h.runner.close()
  const restored = new Runner({
    ...h.options,
    store: await EventStore.open(h.storage),
  })
  onTestFinished(() => restored.close())
  await restored.start(false)
  const resumed = turn('restart', 'bob')
  resumed.credential = turn().credential
  h.endpoint.send(resumed)
  await restored.idle()
  const firstPart = h.providers.latest
  h.endpoint.send({
    ...duringTurn(turn('4', 'bob')),
    type: 'message',
    turnId: 'turn-restart',
  })
  await restored.idle()
  firstPart.emit({
    type: 'result',
    state: 'stopped',
    userMessageIds: ['message-restart'],
  })
  await restored.idle()
  expect(h.providers.latest).toBe(firstPart)
  expect(firstPart.closed).toBe(false)
  expect(h.providers.latest.options.conversationId).toBe('conversation-1')
  expect(h.providers.latest.options.credential).toEqual({
    type: 'gateway',
    agent: 'claude',
    kind: 'token',
    token: 'secret-alice',
  })
  expect(JSON.stringify(await h.storage.read())).not.toContain('secret-bob')
  const failed = h.providers.latest
  h.endpoint.send({
    ...duringTurn(turn('failure-next', 'charlie')),
    type: 'message',
    turnId: 'turn-restart',
  })
  await restored.idle()
  expect(failed.messages.map(({ message }) => message.id)).toEqual([
    'message-restart',
    'message-4',
    'message-failure-next',
  ])
  const processCount = h.providers.processes.length
  failed.emit({
    type: 'failed',
    code: 'provider_failed',
    message: 'The provider failed.',
  })
  await restored.idle()
  expect(h.providers.processes).toHaveLength(processCount)
  expect(h.providers.latest).toBe(failed)
  expect(failed.closed).toBe(true)
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-failure-next'],
  })
  await restored.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    turnId: 'turn-restart',
    error: { code: 'provider_failed', message: 'The provider failed.' },
    retryMessageId: 'message-restart',
  })
  expect(h.warnings).toEqual([])
})
