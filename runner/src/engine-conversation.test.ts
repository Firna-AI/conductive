import { expect, it, onTestFinished } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { turn } from '../test-support/harness'
import { fakeCodexAccount } from '../test-support/providers'
import { AgentEngine } from './engine'
import { EventStore } from './state'

it('replaces a saved Codex conversation with its fork and resumes it after a restart', async () => {
  const h = await engineFixture()
  await h.engine.command(turn('original', 'alice', 'codex'))
  const original = h.providers.latest
  original.emit({ type: 'result', state: 'finished', userMessageIds: [] })
  await h.engine.idle()

  const switched = turn('switched', 'alice', 'codex')
  switched.credential = {
    agent: 'codex',
    kind: 'token',
    token: 'fake-chatgpt-turn-token',
    account: fakeCodexAccount,
  }
  await h.engine.command(switched)
  const fork = h.providers.latest
  expect(fork.options.conversationId).toBe('conversation-1')
  fork.emit({ type: 'conversation', id: 'forked-conversation' })
  fork.emit({ type: 'result', state: 'finished', userMessageIds: [] })
  await h.engine.idle()
  expect(h.store.snapshot.sessions[0].providerSessionId).toBe(
    'forked-conversation',
  )
  await h.engine.close()

  const store = await EventStore.open(h.storage)
  expect(store.snapshot.sessions[0].providerSessionId).toBe(
    'forked-conversation',
  )
  h.options.store = store
  const restarted = new AgentEngine(h.options)
  onTestFinished(() => restarted.close())
  const next = turn('next', 'alice', 'codex')
  next.credential = switched.credential
  await restarted.command(next)
  expect(h.providers.latest.options.conversationId).toBe('forked-conversation')
  expect(h.providers.latest.messages.map(({ message }) => message.id)).toEqual([
    'message-next',
  ])
})
