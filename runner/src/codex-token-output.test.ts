import { expect, it } from 'vitest'

import { turn } from '../test-support/harness'
import { fakeCodexAccount } from '../test-support/providers'
import { wireFixture } from '../test-support/wire'

it('hides a Codex turn token split across output before sending or saving it', async () => {
  const h = await wireFixture()
  h.endpoint.confirmEvents = false
  await h.runner.start(false)
  const command = turn('1', 'alice', 'codex')
  command.credential = {
    agent: 'codex',
    kind: 'token',
    token: 'sk-fake-gateway-turn-token',
    account: fakeCodexAccount,
  }
  h.endpoint.send(command)
  await h.runner.idle()
  const provider = h.providers.latest
  provider.emit({ type: 'delta', messageId: 'answer', text: 'Login: sk-fake-' })
  await h.runner.idle()
  provider.emit({
    type: 'delta',
    messageId: 'answer',
    text: 'gateway-turn-token.',
  })
  provider.emit({
    type: 'answer',
    messageId: 'answer',
    text: 'Login: sk-fake-gateway-turn-token.',
    userMessageIds: ['message-1'],
  })
  provider.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.map(({ event }) => event)).toContainEqual({
    type: 'assistant.completed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'answer',
    text: 'Login: [redacted].',
    userMessageIds: ['message-1'],
  })
  expect(
    h.endpoint.runnerEvents
      .flatMap(({ event }) =>
        event.type === 'assistant.delta' ? [event.text] : [],
      )
      .join(''),
  ).toBe('Login: [redacted].')
  expect(JSON.stringify(h.endpoint.runnerEvents)).not.toContain(
    command.credential.token,
  )
  expect(JSON.stringify(await h.storage.read())).not.toContain(
    command.credential.token,
  )
})
