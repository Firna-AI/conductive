import { expect, it, onTestFinished } from 'vitest'
import type { FileEntry } from '../../src/shared/generated/FileEntry'
import type { RunnerFileEvent } from '../../src/shared/generated/RunnerFileEvent'
import { emptySnapshot, wireFixture } from '../test-support/wire'
import { Runner } from './runner'
import { EventStore } from './state'

function entries(paths: string[]): FileEntry[] {
  return paths.map((path) => ({
    path,
    name: 'file',
    kind: 'file',
    change: null,
  }))
}

it('sends captured full trees and changes as bounded parts after filtering', async () => {
  const snapshot = emptySnapshot()
  snapshot.changes = {
    ...snapshot.changes,
    unpushedCommits: 3,
    uncommittedFileCount: 4,
  }
  snapshot.entries = entries(
    Array.from({ length: 6 }, (_, index) => 'x'.repeat(9_000) + index),
  )
  snapshot.changes.files = snapshot.entries.map(({ path }) => ({
    path,
    change: 'modified',
    added: 2,
    removed: 1,
    uncommitted: true,
  }))
  snapshot.changes.summary = { files: 6, added: 12, removed: 6 }
  let captured = false
  const h = await wireFixture(
    snapshot,
    { workspaceToken: 'x' },
    (connection) => ({
      onMessage: (listener) => connection.onMessage(listener),
      onClose: (listener) => connection.onClose(listener),
      close: () => connection.close(),
      send: (message) => {
        connection.send(message)
        if (message.type === 'event' && !captured) {
          captured = true
          h.setSnapshot(emptySnapshot())
        }
      },
    }),
  )
  await h.runner.start(false)
  const trees = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'files.snapshot' ? [event.tree] : [],
  )
  const changes = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'changes.updated' ? [event.changes] : [],
  )
  expect(
    trees.map(({ revision, partNumber, partCount }) => [
      revision,
      partNumber,
      partCount,
    ]),
  ).toEqual([
    [1, 1, 3],
    [1, 2, 3],
    [1, 3, 3],
  ])
  expect(
    changes.map(({ revision, partNumber, partCount }) => [
      revision,
      partNumber,
      partCount,
    ]),
  ).toEqual([
    [1, 1, 3],
    [1, 2, 3],
    [1, 3, 3],
  ])
  const expectedEntries = entries(
    Array.from({ length: 6 }, (_, index) => 'x'.repeat(9_000) + index),
  ).map((entry, index) => ({
    ...entry,
    displayPath: '[redacted]'.repeat(9_000) + index,
  }))
  expect(trees.flatMap((part) => part.entries)).toEqual(expectedEntries)
  expect(
    changes.map((part) => [
      part.baseBranch,
      part.unpushedCommits,
      part.uncommittedFileCount,
      part.summary,
    ]),
  ).toEqual(
    Array.from({ length: 3 }, () => [
      'main',
      3,
      4,
      { files: 6, added: 12, removed: 6 },
    ]),
  )
  expect(h.endpoint.events.map(({ event }) => event)).toEqual([
    { type: 'files.snapshot', tree: { revision: 1, entries: expectedEntries } },
    {
      type: 'changes.updated',
      changes: {
        ...snapshot.changes,
        files: snapshot.changes.files.map((file, index) => ({
          ...file,
          displayPath: expectedEntries[index]?.displayPath,
        })),
      },
    },
  ])
  for (const { event } of h.endpoint.runnerEvents)
    expect(Buffer.byteLength(JSON.stringify(event))).toBeLessThanOrEqual(
      262_144,
    )
  expect(h.warnings).toEqual([])
  const before = h.store.snapshot.nextEventNumber
  const impossible = emptySnapshot()
  impossible.entries = entries(['\n'.repeat(140_000)])
  h.setSnapshot(impossible)
  await h.runner.files.refresh(true)
  expect(h.store.snapshot.nextEventNumber).toBe(before)
  expect(h.warnings).toEqual([
    'The file report contains an entry that exceeds its byte limit.',
  ])
  h.setSnapshot(emptySnapshot())
  await h.runner.files.refresh(true)
  expect(h.endpoint.events.at(-2)?.event).toEqual({
    type: 'files.snapshot',
    tree: { revision: 2, entries: [] },
  })
})

it('splits tree deltas by entry count and serialized event bytes with consecutive revisions', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  const short = emptySnapshot()
  short.entries = entries(
    Array.from({ length: 1_030 }, (_, index) => `file-${index}`),
  )
  h.setSnapshot(short)
  await h.runner.files.refresh()
  const long = emptySnapshot()
  long.entries = entries(
    Array.from({ length: 6 }, (_, index) => '\n'.repeat(30_000) + index),
  )
  h.setSnapshot(long)
  await h.runner.files.refresh()
  const deltas = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'files.changed' ? [event.delta] : [],
  )
  expect(deltas.map((delta) => delta.changes.length)).toEqual([
    512, 512, 6, 512, 512, 10, 2,
  ])
  expect(deltas.map((delta) => delta.revision)).toEqual([2, 3, 4, 5, 6, 7, 8])
  expect(deltas.flatMap((delta) => delta.changes)).toEqual([
    ...short.entries.map((entry) => ({ operation: 'upsert', entry })),
    ...short.entries.map(({ path }) => ({ operation: 'remove', path })),
    ...long.entries.map((entry) => ({ operation: 'upsert', entry })),
  ])
  for (const delta of deltas)
    expect(
      Buffer.byteLength(JSON.stringify({ type: 'files.changed', delta })),
    ).toBeLessThanOrEqual(262_144)
  expect(h.store.snapshot.fileRevisions).toEqual({ tree: 8, changes: 1 })
  expect(h.warnings).toEqual([])
  h.setSnapshot(emptySnapshot())
  await h.runner.files.refresh(true)
  const boundary = emptySnapshot()
  boundary.entries = entries(['a', 'b'])
  const source = () =>
    boundary.entries.map((entry) => ({ operation: 'upsert', entry }))
  const room = 262_144 - Buffer.byteLength(JSON.stringify(source()))
  boundary.entries = entries([
    'a' + 'z'.repeat(Math.floor(room / 2)),
    'b' + 'z'.repeat(Math.ceil(room / 2)),
  ])
  expect(Buffer.byteLength(JSON.stringify(source()))).toBe(262_144)
  h.setSnapshot(boundary)
  await h.runner.files.refresh()
  const bounded = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'files.changed' && event.delta.revision >= 10
      ? [event.delta]
      : [],
  )
  expect(
    bounded.map((delta) => [delta.revision, delta.changes.length]),
  ).toEqual([
    [10, 1],
    [11, 1],
  ])
  expect(bounded.flatMap((delta) => delta.changes)).toEqual(source())
})

it('keeps independent file revisions on full refresh, reconnect, and persistent-stream restart', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  const changed = emptySnapshot()
  changed.entries = entries(['one'])
  h.setSnapshot(changed)
  await h.runner.files.refresh()
  await h.runner.files.refresh(true)
  h.endpoint.disconnect()
  await h.runner.connect()
  await h.runner.close()
  const store = await EventStore.open(h.storage)
  const restarted = new Runner({ ...h.options, store })
  onTestFinished(() => restarted.close())
  await restarted.start(false)
  const reports = h.endpoint.runnerEvents.flatMap(
    ({ event }): Exclude<RunnerFileEvent, { type: 'files.unavailable' }>[] =>
      event.type === 'files.snapshot' ||
      event.type === 'files.changed' ||
      event.type === 'changes.updated'
        ? [event]
        : [],
  )
  expect(
    reports.map((event) => [
      event.type,
      event.type === 'files.snapshot'
        ? event.tree.revision
        : event.type === 'files.changed'
          ? event.delta.revision
          : event.changes.revision,
    ]),
  ).toEqual([
    ['files.snapshot', 1],
    ['changes.updated', 1],
    ['files.changed', 2],
    ['files.snapshot', 3],
    ['changes.updated', 2],
    ['files.snapshot', 4],
    ['changes.updated', 3],
    ['files.snapshot', 5],
    ['changes.updated', 4],
  ])
  expect(store.snapshot.fileRevisions).toEqual({ tree: 5, changes: 4 })
  expect(store.snapshot.streamId).toBe(h.store.snapshot.streamId)
  expect(store.snapshot.outbox).toEqual([])
  expect(reports[0]).toEqual({
    type: 'files.snapshot',
    tree: { revision: 1, partNumber: 1, partCount: 1, entries: [] },
  })
  expect(reports[1]).toEqual({
    type: 'changes.updated',
    changes: {
      ...emptySnapshot().changes,
      revision: 1,
      partNumber: 1,
      partCount: 1,
    },
  })
  expect(h.warnings).toEqual([])
})
