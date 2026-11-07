import { expect, it, onTestFinished } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { turn } from '../test-support/harness'
import { AgentEngine } from './engine'
import { EventStore } from './state'

it('ignores input after completion and accepts its explicit continuation turn', async () => {
  const h = await engineFixture()
  await h.engine.command(turn())
  await h.engine.idle()
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.engine.idle()
  const completed = structuredClone(h.events)
  const late = { ...turn('late'), type: 'message' as const, turnId: 'turn-1' }
  await h.engine.command(late)
  await h.engine.idle()
  expect(h.events).toEqual(completed)
  expect(
    h.providers.latest.messages.map((command) => command.message.id),
  ).toEqual(['message-1'])
  expect(h.warnings).toHaveLength(1)
  await h.engine.command(late)
  expect(h.warnings).toHaveLength(1)

  const continuation = {
    ...late,
    type: 'turn' as const,
    commandId: 'continuation-late',
    turnId: 'turn-2',
  }
  await h.engine.command(continuation)
  await h.engine.command(continuation)
  await h.engine.idle()
  expect(
    h.providers.latest.messages.map((command) => command.message.id),
  ).toEqual(['message-late'])
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.started',
    turnId: 'turn-2',
    messageIds: ['message-late'],
  })
  const followup = {
    ...turn('followup'),
    type: 'message' as const,
    turnId: 'turn-2',
  }
  await h.engine.command(followup)
  await h.engine.command(followup)
  await h.engine.idle()
  expect(
    h.providers.latest.messages.map((command) => command.message.id),
  ).toEqual(['message-late', 'message-followup'])
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-late', 'message-followup'],
  })
  await h.engine.idle()
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-2',
    state: 'finished',
  })

  await h.engine.close()
  const restarted = new AgentEngine({
    ...h.options,
    store: await EventStore.open(h.storage),
  })
  onTestFinished(() => restarted.close())
  const beforeRestartInput = structuredClone(h.events)
  await restarted.command({ ...late, commandId: 'after-restart' })
  await restarted.command({
    ...late,
    commandId: 'unknown-session',
    sessionId: 'missing-session',
    message: { ...late.message, sessionId: 'missing-session' },
  })
  await restarted.idle()
  expect(h.events).toEqual(beforeRestartInput)
  expect(h.providers.processes).toHaveLength(2)
  expect(h.warnings).toHaveLength(3)
})

it('ignores mismatched input without changing the running turn', async () => {
  const h = await engineFixture()
  await h.engine.command(turn('active'))
  await h.engine.idle()
  const running = structuredClone(h.events)
  await h.engine.command({
    ...turn('old', 'bob', 'codex'),
    type: 'message',
    turnId: 'old-turn',
  })
  await h.engine.idle()
  expect(h.events).toEqual(running)
  expect(h.warnings).toHaveLength(1)
  expect(h.providers.processes).toHaveLength(1)
  expect(
    h.providers.latest.messages.map((command) => command.message.id),
  ).toEqual(['message-active'])
  await h.engine.command({
    ...turn('current'),
    type: 'message',
    turnId: 'turn-active',
  })
  await h.engine.idle()
  expect(
    h.providers.latest.messages.map((command) => command.message.id),
  ).toEqual(['message-active', 'message-current'])
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-active', 'message-current'],
  })
  await h.engine.idle()
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-active',
    state: 'finished',
  })
})

it('acknowledges unmatched interrupts without stopping another running turn', async () => {
  const h = await engineFixture()
  await h.engine.command(turn('active'))
  await h.engine.idle()
  const interrupt = {
    type: 'interrupt' as const,
    commandId: 'stop-other',
    sessionId: 'session-1',
    turnId: 'turn-other',
  }
  await h.engine.command(interrupt)
  await h.engine.idle()
  expect(h.events.at(-1)).toEqual({
    type: 'turn.completed',
    sessionId: 'session-1',
    turnId: 'turn-other',
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [],
  })
  await h.engine.command(interrupt)
  expect(h.events).toHaveLength(2)
  await h.engine.command({
    ...interrupt,
    commandId: 'stop-missing',
    sessionId: 'missing-session',
    turnId: 'turn-missing',
  })
  await h.engine.idle()
  expect(h.events.at(-1)).toEqual({
    type: 'turn.completed',
    sessionId: 'missing-session',
    turnId: 'turn-missing',
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [],
  })
  expect(h.providers.latest.stops).toBe(0)
  expect(h.providers.latest.interrupts).toBe(0)
  expect(h.providers.latest.closed).toBe(false)
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-active'],
  })
  await h.engine.idle()
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-active',
    state: 'finished',
  })
  await h.engine.command({ ...interrupt, commandId: 'stop-idle' })
  await h.engine.idle()
  expect(h.events.at(-1)).toEqual({
    type: 'turn.completed',
    sessionId: 'session-1',
    turnId: 'turn-other',
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [],
  })
  expect(h.store.snapshot.sessions.map((session) => session.sessionId)).toEqual(
    ['session-1'],
  )
})
