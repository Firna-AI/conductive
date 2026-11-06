import { expect, it, onTestFinished } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { Runner } from './runner'
import { EventStore } from './state'

it('changes sender credentials at a tool boundary and resumes stored conversation memory', async () => {
  const h = await runnerHarness()
  h.endpoint.send(turn())
  await h.runner.idle()
  const alice = h.providers.latest
  h.endpoint.send({ ...turn('2', 'bob'), type: 'message', turnId: 'turn-1' })
  const queued = turn('queued', 'bob')
  queued.message.choice = {
    agent: 'claude',
    model: 'bob-model',
    effort: 'medium',
  }
  h.endpoint.send({ ...queued, type: 'message', turnId: 'turn-1' })
  await h.runner.idle()
  expect(alice.messages.map((message) => message.message.id)).toEqual([
    'message-1',
  ])
  alice.emit({
    type: 'tool',
    tool: {
      id: 'tool',
      kind: 'read',
      target: 'README.md',
      detail: null,
      state: 'running',
    },
  })
  await h.runner.idle()
  expect(alice.interrupts).toBe(1)
  alice.emit({
    type: 'result',
    state: 'stopped',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  const bob = h.providers.latest
  expect(alice.closed).toBe(true)
  expect(bob.options.login).toEqual({
    agent: 'claude',
    kind: 'token',
    secret: 'secret-bob',
  })
  expect(bob.options.conversationId).toBe('conversation-1')
  expect(bob.messages.map((message) => message.message.id)).toEqual([
    'message-2',
    'message-queued',
  ])
  expect(bob.choices.at(-1)).toEqual({
    agent: 'claude',
    model: 'bob-model',
    effort: 'medium',
  })
  alice.emit({ type: 'delta', messageId: 'late', text: 'stale process output' })
  bob.emit({
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
  expect(JSON.stringify(h.endpoint.events)).not.toContain(
    'stale process output',
  )
  h.endpoint.send(turn('3', 'alice'))
  await h.runner.idle()
  expect(h.providers.latest.options.login.secret).toBe('secret-alice')
  expect(h.providers.latest.options.conversationId).toBe('conversation-1')
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
  h.endpoint.send(turn('4', 'bob'))
  await restored.idle()
  expect(h.providers.latest.options.conversationId).toBe('conversation-1')
  expect(h.providers.latest.options.login.secret).toBe('secret-bob')
  expect(JSON.stringify(await h.storage.read())).not.toContain('secret-bob')
  const failed = h.providers.latest
  h.endpoint.send({
    ...turn('failure-next', 'charlie'),
    type: 'message',
    turnId: 'turn-4',
  })
  await restored.idle()
  failed.emit({
    type: 'failed',
    code: 'provider_failed',
    message: 'The provider failed.',
  })
  await restored.idle()
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-failure-next'],
  })
  await restored.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-4',
    state: 'finished',
    userMessageIds: ['message-4', 'message-failure-next'],
  })
  expect(h.warnings).toEqual([])
})
