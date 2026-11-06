import { expect, it } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'

it('combines partial text, steers a turn, and reports actual touched files', async () => {
  const h = await runnerHarness()
  h.endpoint.confirmEvents = false
  await h.write('README.md', 'before\nsame\n')
  h.endpoint.send(turn())
  await h.runner.idle()
  const provider = h.providers.latest
  provider.emit({ type: 'thinking' })
  provider.emit({ type: 'delta', messageId: 'answer', text: 'Hello ' })
  provider.emit({ type: 'delta', messageId: 'answer', text: 'secret-alice' })
  const message = turn('2')
  h.endpoint.send({ ...message, type: 'message', turnId: 'turn-1' })
  h.endpoint.send({
    type: 'model',
    commandId: 'model-1',
    sessionId: 'session-1',
    choice: { agent: 'claude', model: 'new-model', effort: 'max' },
  })
  await h.runner.idle()
  expect(provider.messages.map((message) => message.message.id)).toEqual([
    'message-1',
    'message-2',
  ])
  expect(provider.choices.at(-1)).toEqual({
    agent: 'claude',
    model: 'new-model',
    effort: 'max',
  })
  expect(h.endpoint.runnerEvents.map((item) => item.event)).toContainEqual({
    type: 'assistant.delta',
    sessionId: 'session-1',
    turnId: 'turn-1',
    messageId: 'answer',
    text: 'Hello [redacted]',
  })
  await h.write('README.md', 'after\nsame\n')
  provider.emit({
    type: 'answer',
    messageId: 'answer',
    text: 'Done.',
    userMessageIds: ['message-1', 'message-2'],
  })
  h.advance(150)
  provider.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1', 'message-2'],
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'turn.completed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    state: 'finished',
    durationMs: 150,
    files: [{ path: 'README.md', change: 'modified', added: 1, removed: 1 }],
    userMessageIds: ['message-1', 'message-2'],
  })
  expect(JSON.stringify(await h.storage.read())).not.toContain('secret-alice')
  expect(JSON.stringify(await h.storage.read())).toContain('Hello [redacted]')
  expect(JSON.stringify(h.endpoint.received)).not.toContain('workspace-secret')
  expect(h.warnings).toEqual([])
})

it('stops a turn without an error and keeps the session on its original agent', async () => {
  const h = await runnerHarness()
  h.endpoint.send(turn())
  await h.runner.idle()
  const provider = h.providers.latest
  provider.emit({
    type: 'tool',
    tool: {
      id: 'tool-1',
      kind: 'run',
      target: 'npm test',
      detail: null,
      state: 'running',
    },
  })
  h.endpoint.send({
    type: 'interrupt',
    commandId: 'stop-1',
    sessionId: 'session-1',
    turnId: 'turn-1',
  })
  await h.runner.idle()
  expect(provider.interrupts).toBe(1)
  provider.emit({
    type: 'failed',
    code: 'interrupted',
    message: 'Synthetic stop failure.',
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'turn.completed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    state: 'stopped',
    durationMs: 0,
    files: [],
    userMessageIds: ['message-1'],
  })
  expect(h.endpoint.runnerEvents.map((event) => event.event)).toContainEqual({
    type: 'tool.updated',
    sessionId: 'session-1',
    turnId: 'turn-1',
    tool: {
      id: 'tool-1',
      kind: 'run',
      target: 'npm test',
      detail: null,
      state: 'stopped',
    },
  })
  h.endpoint.send(turn('2', 'alice', 'codex'))
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.failed',
    error: { code: 'session_agent_mismatch' },
    retryMessageId: 'message-2',
  })
  expect(h.providers.processes).toHaveLength(1)
  h.endpoint.send(turn('3'))
  await h.runner.idle()
  provider.emit({
    type: 'failed',
    code: 'agent_failed',
    message: 'Provider failed.',
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'turn.failed',
    sessionId: 'session-1',
    turnId: 'turn-3',
    error: { code: 'agent_failed', message: 'Provider failed.' },
    retryMessageId: 'message-3',
    durationMs: 0,
  })
})
