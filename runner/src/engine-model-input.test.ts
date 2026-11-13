import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { duringTurn, turn } from '../test-support/harness'
import type { ProviderProcess } from '../sdk-helper/src/providers/types'

it('keeps the turn login and member order when a model change needs a new provider', async () => {
  const h = await engineFixture()
  const initial = turn()
  initial.commitAuthor = {
    name: 'Alice Example',
    email: '1+alice@users.noreply.github.com',
  }
  await h.engine.command(initial)
  await h.engine.idle()
  const first = h.providers.latest
  const process: ProviderProcess = first
  vi.spyOn(process, 'model').mockResolvedValue('deferred')
  const next = turn('next', 'bob')
  next.commitAuthor = {
    name: 'Bob Example',
    email: '2+bob@users.noreply.github.com',
  }
  next.message.choice = {
    agent: 'claude',
    model: 'next-model',
    effort: 'max',
    fast: false,
  }
  await h.engine.command({
    ...duringTurn(next),
    type: 'message',
    turnId: 'turn-1',
  })
  const last = turn('last', 'charlie')
  last.message.choice = next.message.choice
  await h.engine.command({
    ...duringTurn(last),
    type: 'message',
    turnId: 'turn-1',
  })
  expect(first.messages.map(({ message }) => message.id)).toEqual(['message-1'])
  first.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.engine.idle()
  const second = h.providers.latest
  expect(second.options.endpoint).toBe(
    'https://machines.conductive.test/v1/model/claude',
  )
  expect(first.closed).toBe(true)
  expect(h.providers.processes).toHaveLength(2)
  expect(second.options.credential).toEqual({
    type: 'gateway',
    agent: 'claude',
    kind: 'token',
    token: 'secret-alice',
  })
  expect(second.options.commitAuthor).toEqual({
    name: 'Alice Example',
    email: '1+alice@users.noreply.github.com',
  })
  expect(second.options.conversationId).toBe('conversation-1')
  expect(second.options.choice).toEqual({
    agent: 'claude',
    model: 'next-model',
    effort: 'max',
    fast: false,
  })
  expect(
    second.messages.map(({ message }) => [message.id, message.sender.id]),
  ).toEqual([
    ['message-next', 'bob'],
    ['message-last', 'charlie'],
  ])
  expect(h.events.map((event) => event.type)).toEqual(['turn.started'])
  first.emit({ type: 'delta', messageId: 'old', text: 'Old provider output.' })
  second.emit({
    type: 'failed',
    code: 'provider_failed',
    message: 'The provider failed.',
  })
  await h.engine.idle()
  expect(second.closed).toBe(true)
  expect(h.providers.processes).toHaveLength(2)
  expect(h.events).toEqual([
    {
      type: 'turn.started',
      sessionId: 'session-1',
      turnId: 'turn-1',
      senderId: 'alice',
      choice: {
        agent: 'claude',
        model: 'test-model',
        effort: 'high',
        fast: false,
      },
      startedAt: 100,
      messageIds: ['message-1'],
    },
    {
      type: 'turn.failed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      error: { code: 'provider_failed', message: 'The provider failed.' },
      retryMessageId: 'message-next',
      durationMs: 0,
    },
  ])
  expect(h.warnings).toEqual([])
})
