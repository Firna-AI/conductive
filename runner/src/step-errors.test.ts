import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { sessionTurn } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { Repository } from './repository'

it.each(['acceptance save', 'session save', 'start save', 'checkpoint'])(
  'ends a turn after its %s fails and accepts the next turn',
  async (step) => {
    const h = await engineFixture()
    const open = h.options.providers.claude
    const savedBeforeStart: (string | undefined)[] = []
    h.options.providers.claude = async (options) => {
      savedBeforeStart.push(
        h.store.snapshot.sessions.find(
          (session) => session.sessionId === 'failing',
        )?.instructions,
      )
      return open(options)
    }
    const error = new Error(`The ${step} failed.`)
    if (step === 'session save')
      vi.spyOn(h.store, 'remember').mockRejectedValueOnce(error)
    else if (step === 'checkpoint')
      h.options.checkpoint = vi
        .fn(h.options.checkpoint)
        .mockRejectedValueOnce(error)
    else {
      const write = h.storage.write.bind(h.storage)
      let failed = false
      vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
        if (
          !failed &&
          (step === 'acceptance save'
            ? state.turns.length > 0 && state.outbox.length === 0
            : state.outbox.at(-1)?.event.type === 'turn.started')
        ) {
          failed = true
          throw error
        }
        await write(state)
      })
    }
    const command = sessionTurn('failing')
    await h.engine.command(command)
    await h.engine.idle()
    expect(h.events.at(-1)).toEqual({
      type: 'turn.failed',
      sessionId: 'failing',
      turnId: 'turn-failing',
      error: { code: 'agent_failed', message: `The ${step} failed.` },
      retryMessageId: 'message-failing',
      durationMs: 0,
    })
    expect(h.providers.processes).toHaveLength(0)
    await h.engine.command(sessionTurn('failing', 'next'))
    expect(h.providers.processes).toHaveLength(1)
    expect(savedBeforeStart).toEqual([h.providers.latest.options.instructions])
  },
)

it.each(['files.snapshot', 'runner.ready'])(
  'still sends ready after a failed %s save during connection',
  async (type) => {
    const h = await wireFixture()
    const write = h.storage.write.bind(h.storage)
    let failed = false
    vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
      if (!failed && state.outbox.at(-1)?.event.type === type) {
        failed = true
        throw new Error('The initial event cannot be saved.')
      }
      await write(state)
    })
    await h.runner.start(false)
    expect(failed).toBe(true)
    expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
      type: 'runner.ready',
    })
    await h.runner.engine.command(sessionTurn('after-ready'))
    expect(h.providers.processes).toHaveLength(1)
  },
)

it.each([
  { end: 'finished', state: 'finished', processes: 2 },
  { end: 'shutdown', state: 'stopped', processes: 1 },
])(
  'keeps the $end end when changed files cannot be read',
  async ({ end, state, processes }) => {
    const h = await engineFixture({
      changedSince: async () => {
        throw new Error('Unreadable files.')
      },
    })
    await h.engine.command(sessionTurn('finished'))
    let ending = Promise.resolve()
    if (end === 'finished')
      h.providers.latest.emit({
        type: 'result',
        state: 'finished',
        userMessageIds: [],
      })
    else ending = h.engine.close()
    await expect(ending).resolves.toBeUndefined()
    await h.engine.idle()
    expect(h.events.at(-1)).toEqual({
      type: 'turn.completed',
      sessionId: 'finished',
      turnId: 'turn-finished',
      state,
      durationMs: 0,
      files: [],
      filesUnavailable: true,
      omittedFileCount: 0,
      userMessageIds: ['message-finished'],
    })
    await h.engine.command(sessionTurn('finished', 'next'))
    expect(h.providers.processes).toHaveLength(processes)
  },
)

it('sends ready after a failed tree scan and sends a full tree on recovery', async () => {
  const h = await wireFixture()
  const scan = vi.spyOn(Repository.prototype, 'snapshot')
  scan.mockRejectedValueOnce(new Error('Unreadable tree.'))
  await h.runner.start(false)
  expect(h.endpoint.runnerEvents.map(({ event }) => event)).toEqual([
    { type: 'files.unavailable' },
    { type: 'runner.ready' },
  ])
  await h.runner.files.refresh()
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents.slice(-2).map(({ event }) => event.type),
  ).toEqual(['files.snapshot', 'changes.updated'])
  scan.mockRejectedValueOnce(new Error('Unreadable again.'))
  await h.runner.files.refresh()
  await h.runner.files.refresh()
  await h.runner.idle()
  expect(
    h.endpoint.runnerEvents.slice(-2).map(({ event }) => event.type),
  ).toEqual(['files.unavailable', 'files.snapshot'])
})

it.each([
  { failedWrites: 1, endsBeforeStop: 1 },
  { failedWrites: 2, endsBeforeStop: 0 },
])(
  'keeps the first terminal after $failedWrites failed writes and a fresh Stop',
  async ({ failedWrites, endsBeforeStop }) => {
    const h = await wireFixture()
    await h.runner.start(false)
    h.endpoint.confirmEvents = false
    const command = sessionTurn('terminal')
    h.endpoint.send(command)
    await h.runner.idle()
    h.setTurnFiles([
      { path: 'kept.txt', change: 'modified', added: 2, removed: 1 },
    ])
    const write = h.storage.write.bind(h.storage)
    let rejectedWrites = 0
    vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
      if (
        rejectedWrites < failedWrites &&
        state.outbox.at(-1)?.event.type === 'turn.completed'
      ) {
        rejectedWrites++
        throw new Error('The end cannot be saved.')
      }
      await write(state)
    })
    h.providers.latest.emit({
      type: 'result',
      state: 'finished',
      userMessageIds: [],
    })
    await h.runner.idle()
    expect(rejectedWrites).toBe(failedWrites)
    expect(
      h.endpoint.runnerEvents.filter(
        ({ event }) => event.type === 'turn.completed',
      ),
    ).toHaveLength(endsBeforeStop)
    h.endpoint.send({ ...command, commandId: 'repeat' })
    h.endpoint.send({
      type: 'interrupt',
      commandId: 'stop',
      sessionId: command.sessionId,
      turnId: command.turnId,
    })
    await h.runner.idle()
    const ends = h.endpoint.runnerEvents.filter(
      ({ event }) =>
        event.type === 'turn.completed' || event.type === 'turn.failed',
    )
    expect(ends).toHaveLength(1)
    expect(ends).toEqual([
      {
        type: 'event',
        streamId: h.store.snapshot.streamId,
        eventNumber: 5,
        occurredAt: 100,
        event: {
          type: 'turn.completed',
          sessionId: 'terminal',
          turnId: 'turn-terminal',
          state: 'finished',
          durationMs: 0,
          files: [
            { path: 'kept.txt', change: 'modified', added: 2, removed: 1 },
          ],
          omittedFileCount: 0,
          userMessageIds: ['message-terminal'],
        },
      },
    ])
    expect(
      h.endpoint.runnerEvents.map(({ eventNumber }) => eventNumber),
    ).toEqual([1, 2, 3, 4, 5])
    expect(h.providers.processes).toHaveLength(1)
    expect(
      h.store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
    ).toEqual([5])
    expect(h.store.snapshot.outbox.map(({ event }) => event.type)).toEqual([
      'turn.started',
      'turn.completed',
    ])
  },
)
