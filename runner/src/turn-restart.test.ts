import { expect, it, onTestFinished } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { Runner } from './runner'
import { EventStore } from './state'

it('keeps DiskStorage turn records across restart and ends cutoff work without replaying saved turns', async () => {
  const h = await runnerHarness()
  h.endpoint.disconnect()
  const finished = turn('finished')
  const stopped = turn('stopped')
  const cutoff = turn('cutoff')
  await h.runner.engine.command(finished)
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-finished'],
  })
  await h.runner.idle()
  await h.runner.engine.command(stopped)
  await h.runner.engine.command({
    type: 'interrupt',
    commandId: 'stop-stopped',
    sessionId: stopped.sessionId,
    turnId: stopped.turnId,
  })
  await h.runner.idle()
  await h.runner.engine.command(cutoff)
  const live = h.providers.latest
  await h.runner.engine.command({ ...cutoff, commandId: 'duplicate-live' })
  await h.runner.idle()
  expect(live.stops).toBe(0)
  expect(live.messages.map((command) => command.message.id)).toEqual([
    'message-cutoff',
  ])
  const before = h.store.snapshot
  expect(before.turns).toEqual([
    {
      sessionId: 'session-1',
      turnId: 'turn-finished',
      startedAt: 100,
      messageIds: ['message-finished'],
      startEventNumber: 4,
      endEventNumber: 5,
    },
    {
      sessionId: 'session-1',
      turnId: 'turn-stopped',
      startedAt: 100,
      messageIds: ['message-stopped'],
      startEventNumber: 6,
      endEventNumber: 7,
    },
    {
      sessionId: 'session-1',
      turnId: 'turn-cutoff',
      startedAt: 100,
      messageIds: ['message-cutoff'],
      startEventNumber: 8,
      endEventNumber: null,
    },
  ])
  await h.cutoff()
  const store = await EventStore.open(h.storage)
  expect(store.snapshot).toEqual(before)
  const processCount = h.providers.processes.length
  h.endpoint.confirmEvents = false
  const restored = new Runner({ ...h.options, store })
  onTestFinished(() => restored.close())
  await restored.start(false)
  await restored.idle()
  expect(h.providers.processes).toHaveLength(processCount)
  const resent = h.endpoint.received.flatMap((message) =>
    message.type === 'event' &&
    message.eventNumber >= 4 &&
    message.eventNumber <= 8
      ? [message]
      : [],
  )
  expect(JSON.stringify(resent)).toBe(JSON.stringify(before.outbox))
  const terminal = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'turn.completed' || event.type === 'turn.failed'
      ? [event]
      : [],
  )
  expect(
    terminal.map((event) => [
      event.turnId,
      event.type === 'turn.completed' ? event.state : 'failed',
    ]),
  ).toEqual([
    ['turn-finished', 'finished'],
    ['turn-stopped', 'stopped'],
    ['turn-cutoff', 'stopped'],
  ])
  const beforeReplay = structuredClone(h.endpoint.runnerEvents)
  for (const command of [finished, stopped, cutoff]) {
    h.endpoint.send({ ...command, commandId: `replay-${command.commandId}` })
    h.endpoint.send({
      type: 'interrupt',
      commandId: `again-${command.commandId}`,
      sessionId: command.sessionId,
      turnId: command.turnId,
    })
  }
  await restored.idle()
  expect(h.endpoint.runnerEvents).toEqual(beforeReplay)
  expect(h.providers.processes).toHaveLength(processCount)
  expect(store.snapshot.turns.map((record) => record.endEventNumber)).toEqual([
    5, 7, 9,
  ])
  h.endpoint.confirmEvents = true
  h.endpoint.disconnect()
  await restored.connect()
  await restored.idle()
  expect(store.snapshot.turns).toEqual([])
  const raw = JSON.stringify(await h.storage.read())
  expect(raw).not.toContain('secret-alice')
  expect(raw).not.toContain('commandId')
  expect(raw).not.toContain('login')
  expect(h.warnings).toEqual([])
})
