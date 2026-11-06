import { expect, it } from 'vitest'

import { FilesState } from '../files/state'
import type { FilesStorage } from '../files/storage'
import {
  createRunnerLimitsFixture,
  snapshot,
} from './runner-limits.test-support'

function fileStorage(
  fixture: Awaited<ReturnType<typeof createRunnerLimitsFixture>>,
): FilesStorage {
  return {
    get: (key) => fixture.storage.get(key),
    getMany: async (keys) =>
      new Map(
        await Promise.all(
          keys.map(
            async (key) => [key, await fixture.storage.get(key)] as const,
          ),
        ),
      ),
    write: async () => {
      throw new Error('Read only projection')
    },
  }
}

it('joins trees and independent changes parts before projection, live publication, and confirm across restart', async () => {
  const fixture = await createRunnerLimitsFixture()
  const files = new FilesState(fileStorage(fixture))
  await fixture.receive(1, snapshot(1, 1, 1, ['old.txt']))
  await fixture.receive(2, snapshot(2, 1, 2, ['a.txt']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'old.txt',
  ])
  expect(fixture.published.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
  ])
  const part = (partNumber: number, path: string) => ({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partNumber,
      partCount: 2,
      baseBranch: 'main',
      files: [
        { path, change: 'modified', added: 1, removed: 0, uncommitted: true },
      ],
      summary: { files: 2, added: 2, removed: 0 },
    },
  })
  await fixture.receive(3, part(1, 'a.txt'))
  await fixture.connect('stream', true)
  await fixture.receive(4, snapshot(2, 1, 2, ['a.txt']))
  await fixture.receive(5, snapshot(2, 2, 2, ['b.txt']))
  await fixture.receive(6, part(2, 'b.txt'))
  await fixture.receive(7, snapshot(2, 2, 2, ['b.txt']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'a.txt',
    'b.txt',
  ])
  expect((await files.changes())?.files.map((entry) => entry.path)).toEqual([
    'a.txt',
    'b.txt',
  ])
  expect((await fixture.history()).events.map(({ event }) => event)).toEqual(
    fixture.published.map(({ event }) => event),
  )
  expect(
    (await fixture.history()).events.map(({ event }) => event.type),
  ).toEqual(['files.snapshot', 'files.snapshot', 'changes.updated'])
  expect(JSON.stringify((await fixture.history()).events)).not.toContain(
    'partNumber',
  )
  expect(fixture.hooks).toEqual(fixture.published)
  expect(fixture.sent.at(-1)).toEqual({
    type: 'confirm',
    streamId: 'stream',
    throughEventNumber: 7,
  })
})

it('discards refused and superseded assemblies, keeps complete reports, and isolates streams', async () => {
  const fixture = await createRunnerLimitsFixture()
  const files = new FilesState(fileStorage(fixture))
  await fixture.receive(1, snapshot(1, 1, 1, ['old']))
  await fixture.receive(2, snapshot(2, 1, 2, ['first']))
  await fixture.receive(3, snapshot(2, 1, 2, ['conflict']))
  await fixture.receive(4, snapshot(2, 2, 2, ['tail']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'old',
  ])
  await fixture.receive(5, snapshot(3, 1, 2, ['abandoned']))
  await fixture.receive(6, snapshot(4, 1, 1, ['recovery']))
  await fixture.receive(7, snapshot(5, 1, 2, ['another abandoned']))
  await fixture.connect('new-stream', true)
  await fixture.receive(1, snapshot(1, 2, 2, ['wrong stream tail']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'recovery',
  ])
  await fixture.receive(2, snapshot(2, 1, 1, ['new stream recovery']))
  expect((await files.tree())?.entries.map((entry) => entry.path)).toEqual([
    'new stream recovery',
  ])
  expect(
    (await fixture.history()).events.filter(
      ({ event }) => event.type === 'runner.event-refused',
    ),
  ).toHaveLength(3)
})

it('refuses inconsistent parts, duplicate paths, and gaps or interleaving in tree deltas', async () => {
  const fixture = await createRunnerLimitsFixture()
  const delta = (revision: number) => ({
    type: 'files.changed',
    delta: { revision, changes: [] },
  })
  await fixture.receive(1, snapshot(1, 1, 1, ['old']))
  await fixture.receive(2, delta(3))
  await fixture.receive(3, snapshot(3, 1, 2, ['same']))
  await fixture.receive(4, snapshot(3, 2, 2, ['same']))
  await fixture.receive(5, snapshot(4, 1, 2, ['first']))
  await fixture.receive(6, delta(2))
  await fixture.receive(7, snapshot(5, 1, 1, ['complete']))
  await fixture.receive(8, delta(6))
  expect(
    (await fixture.history()).events.map(({ event }) => event.type),
  ).toEqual([
    'files.snapshot',
    'runner.event-refused',
    'runner.event-refused',
    'runner.event-refused',
    'files.snapshot',
    'files.changed',
  ])
  expect(
    (await fixture.history()).events
      .filter(({ event }) => event.type === 'runner.event-refused')
      .map(({ event }) => event),
  ).toEqual([
    ...[2, 4, 6].map((runnerEventNumber) => ({
      type: 'runner.event-refused',
      streamId: 'stream',
      runnerEventNumber,
      runnerEventType:
        runnerEventNumber === 4 ? 'files.snapshot' : 'files.changed',
      reason: 'invalid',
      sessionId: null,
      turnId: null,
    })),
  ])
})

it('rolls back file part assembly and projection when the receipt commit fails', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.receive(1, snapshot(1, 1, 2, ['first']))
  fixture.storage.failCommit = true
  await expect(fixture.receive(2, snapshot(1, 2, 2, ['last']))).rejects.toThrow(
    'Injected storage failure',
  )
  expect(fixture.published).toEqual([])
  expect(await new FilesState(fileStorage(fixture)).tree()).toBeNull()
  fixture.storage.failCommit = false
  await fixture.connect('stream', true)
  await fixture.receive(2, snapshot(1, 2, 2, ['last']))
  expect(
    (await new FilesState(fileStorage(fixture)).tree())?.entries.map(
      (entry) => entry.path,
    ),
  ).toEqual(['first', 'last'])
  expect((await fixture.history()).events).toHaveLength(1)
})

it('refuses inconsistent changes metadata and empty multipart reports', async () => {
  const changes = (partNumber: number, patch = {}) => ({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partNumber,
      partCount: 2,
      baseBranch: 'main',
      files: [
        {
          path: `file-${partNumber}`,
          change: 'modified',
          added: 1,
          removed: 0,
          uncommitted: true,
        },
      ],
      summary: { files: 2, added: 2, removed: 0 },
      ...patch,
    },
  })
  for (const patch of [
    { baseBranch: 'other' },
    { partCount: 3 },
    { summary: { files: 3, added: 2, removed: 0 } },
  ]) {
    const fixture = await createRunnerLimitsFixture()
    await fixture.receive(1, changes(1))
    await fixture.receive(2, changes(2, patch))
    expect(
      (await fixture.history()).events.map(({ event }) => event.type),
    ).toEqual(['runner.event-refused'])
    expect(await new FilesState(fileStorage(fixture)).changes()).toBeNull()
  }
  for (const type of ['files.snapshot', 'changes.updated']) {
    const fixture = await createRunnerLimitsFixture()
    const empty = (partNumber: number) =>
      type === 'files.snapshot'
        ? snapshot(1, partNumber, 2, [])
        : changes(partNumber, {
            files: [],
            summary: { files: 0, added: 0, removed: 0 },
          })
    await fixture.receive(1, empty(1))
    await fixture.receive(2, empty(2))
    expect(
      (await fixture.history()).events.map(({ event }) => event.type),
    ).toEqual(['runner.event-refused'])
  }
})
