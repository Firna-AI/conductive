import { expect, it } from 'vitest'

import { loadReportState, storedParts } from '../files/report-storage'
import { FilesState } from '../files/state'
import { chatFilesStorage } from './files-storage'
import {
  context,
  createRunnerLimitsFixture,
  snapshot,
} from './runner-limits.test-support'

it.each(['turn.completed', 'turn.failed'])(
  'keeps the refusal and terminal cleanup after a post-commit crash for %s',
  async (type) => {
    const fixture = await createRunnerLimitsFixture()
    const terminal = { type, ...context, state: 'finished' }
    await fixture.read((view) =>
      view.saveCommand({
        type: 'interrupt',
        commandId: 'pending-stop',
        ...context,
      }),
    )
    fixture.storage.crashAfterCommit = true
    await expect(fixture.receive(1, terminal)).rejects.toThrow(
      'Injected post-commit crash',
    )
    expect(fixture.closed).toBe(1)
    expect(fixture.published).toEqual([])
    await fixture.connect('stream', true)
    expect(await fixture.read((view) => view.turn(context.turnId))).toEqual({
      id: 'turn',
      sessionId: 'session',
      senderId: 'sender',
      messageIds: [],
      state: 'failed',
      closeAfterStop: false,
      started: true,
      nextTurnId: null,
    })
    expect(
      (await fixture.read((view) => view.session(context.sessionId)))
        ?.activeTurnId,
    ).toBeNull()
    expect(await fixture.read((view) => view.pending())).toEqual([])
    expect(await fixture.read((view) => view.cursor('stream'))).toBe(1)
    const history = await fixture.history()
    expect(history.throughEventNumber).toBe(2)
    expect(history.events.map(({ event }) => event.type)).toEqual([
      'runner.event-refused',
      'session.updated',
    ])
    expect(history.events[0]?.event).toEqual({
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber: 1,
      runnerEventType: type,
      reason: 'invalid',
      sessionId: 'session',
      turnId: 'turn',
    })
    await fixture.receive(1, terminal)
    expect(await fixture.history()).toEqual(history)
    expect(fixture.sent.at(-1)).toEqual({
      type: 'confirm',
      streamId: 'stream',
      throughEventNumber: 1,
    })
  },
)

it('keeps pending file assembly after a post-commit crash and resumes the join after restart', async () => {
  const fixture = await createRunnerLimitsFixture()
  const storage = chatFilesStorage(fixture.storage)
  const files = new FilesState(storage)
  await fixture.receive(1, snapshot(1, 1, 1, ['old']))
  fixture.storage.crashAfterCommit = true
  await expect(
    fixture.receive(2, snapshot(2, 1, 2, ['first'])),
  ).rejects.toThrow('Injected post-commit crash')
  expect(fixture.closed).toBe(1)
  expect(fixture.published.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
  ])
  await fixture.connect('stream', true)
  const state = await loadReportState(storage)
  expect(state).toEqual({
    streamId: 'stream',
    tree: {
      appliedRevision: 1,
      seen: true,
      report: { revision: 2, partCount: 2, through: 1 },
    },
    changes: { appliedRevision: 0, seen: false, report: null },
  })
  expect(
    await storedParts(storage, 'tree', {
      revision: 2,
      partCount: 2,
      through: 1,
    }),
  ).toEqual([snapshot(2, 1, 2, ['first'])])
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'old',
  ])
  expect(await fixture.read((view) => view.cursor('stream'))).toBe(2)
  expect(fixture.sent.at(-1)).toEqual({
    type: 'welcome',
    protocolVersion: 1,
    streamId: 'stream',
    confirmedThrough: 2,
  })
  await fixture.receive(3, snapshot(2, 2, 2, ['last']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'first',
    'last',
  ])
  const history = await fixture.history()
  expect(history.events.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
    'files.snapshot',
  ])
  expect(history.events[1]?.event).toEqual({
    type: 'files.snapshot',
    tree: {
      revision: 2,
      entries: [
        { path: 'first', name: 'first', kind: 'file', change: null },
        { path: 'last', name: 'last', kind: 'file', change: null },
      ],
    },
  })
  await fixture.receive(3, snapshot(2, 2, 2, ['last']))
  expect(await fixture.history()).toEqual(history)
  expect(fixture.sent.at(-1)).toEqual({
    type: 'confirm',
    streamId: 'stream',
    throughEventNumber: 3,
  })
})
