import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { deferred, sessionTurn, stop } from '../test-support/runtime'

it('closes a finished provider before its completion and resumes its saved conversation', async () => {
  const h = await engineFixture()
  await h.engine.command(sessionTurn('finished'))
  await h.engine.idle()
  const provider = h.providers.latest
  const closing = deferred<void>()
  const release = deferred<void>()
  vi.spyOn(provider, 'close').mockImplementation(async () => {
    closing.resolve()
    await release.promise
    provider.closed = true
  })
  provider.emit({ type: 'result', state: 'finished', userMessageIds: [] })
  const settled = h.engine.idle()
  try {
    await Promise.race([closing.promise, settled])
    expect(h.events.map((event) => event.type)).toEqual(['turn.started'])
  } finally {
    release.resolve()
    await settled
  }
  expect(provider.closed).toBe(true)
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
  })
  await h.engine.command(stop('finished'))
  expect(
    h.events.filter((event) => event.type === 'turn.completed'),
  ).toHaveLength(1)
  await h.engine.command(sessionTurn('finished', 'next'))
  expect(h.providers.processes).toHaveLength(2)
  expect(h.providers.latest.options.conversationId).toBe('conversation-1')
  expect(h.providers.latest.messages.map(({ message }) => message.id)).toEqual([
    'message-next',
  ])
  provider.emit({ type: 'delta', messageId: 'stale', text: 'Old output.' })
  await h.engine.idle()
  expect(h.events.map((event) => event.type)).toEqual([
    'turn.started',
    'turn.completed',
    'turn.started',
  ])
  expect(h.warnings).toEqual([])
})
