import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { turn } from '../test-support/harness'
import type { ProviderProcess } from './providers/types'

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
  next.message.choice = { agent: 'claude', model: 'next-model', effort: 'max' }
  await h.engine.command({ ...next, type: 'message', turnId: 'turn-1' })
  const last = turn('last', 'charlie')
  last.message.choice = next.message.choice
  await h.engine.command({ ...last, type: 'message', turnId: 'turn-1' })
  expect(first.messages.map(({ message }) => message.id)).toEqual(['message-1'])
  first.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.engine.idle()
  const second = h.providers.latest
  expect(first.closed).toBe(true)
  expect(h.providers.processes).toHaveLength(2)
  expect(second.options.login).toEqual({
    agent: 'claude',
    kind: 'token',
    secret: 'secret-alice',
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
      choice: { agent: 'claude', model: 'test-model', effort: 'high' },
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
