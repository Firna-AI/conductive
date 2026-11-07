import { expect, it, onTestFinished, vi } from 'vitest'

import { repositoryFixture } from '../test-support/repository'
import { refresh, reportSnapshot } from '../test-support/reports'
import { deferred } from '../test-support/runtime'
import { emptySnapshot, wireFixture } from '../test-support/wire'
import { Repository } from './repository'
import { Runner } from './runner'

it('answers a refresh after welcome while the initial scan still holds runner ready', async () => {
  const h = await wireFixture()
  await h.runner.link.emit({ type: 'workspace.title', name: 'Saved name' })
  const scanning = deferred<void>()
  const release = deferred<void>()
  vi.spyOn(Repository.prototype, 'snapshot').mockImplementationOnce(
    async () => {
      scanning.resolve()
      await release.promise
      return emptySnapshot()
    },
  )
  const starting = h.runner.start(false)
  try {
    await scanning.promise
    h.endpoint.send(refresh('workspace.title', 'before-ready'))
    await h.runner.idle()
    expect(h.endpoint.runnerEvents.map(({ event }) => event)).toEqual([
      { type: 'workspace.title', name: 'Saved name' },
      { type: 'workspace.title', name: 'Saved name' },
    ])
    expect(h.providers.processes).toHaveLength(0)
  } finally {
    release.resolve()
    await starting
  }
  expect(h.endpoint.runnerEvents.map(({ event }) => event.type)).toEqual([
    'workspace.title',
    'workspace.title',
    'files.snapshot',
    'changes.updated',
    'runner.ready',
  ])
  expect(h.warnings).toEqual([])
})

it('serializes refresh parts and monitor deltas without interleaving file revisions', async () => {
  const repository = await repositoryFixture()
  const h = await wireFixture()
  const large = reportSnapshot(
    Array.from({ length: 6 }, (_, index) => 'x'.repeat(90_000) + index),
  )
  const small = reportSnapshot(['monitor-file'])
  const snapshots = vi.spyOn(Repository.prototype, 'snapshot')
  snapshots
    .mockResolvedValueOnce(emptySnapshot())
    .mockResolvedValueOnce(large)
    .mockResolvedValueOnce(small)
    .mockResolvedValueOnce(large)
    .mockResolvedValueOnce(large)
    .mockResolvedValueOnce(large)
  const runner = new Runner({ ...h.options, cwd: repository.root })
  onTestFinished(() => runner.close())
  await runner.start()
  const firstPart = deferred<void>()
  const release = deferred<void>()
  const monitored = deferred<void>()
  const emit = runner.link.emit.bind(runner.link)
  vi.spyOn(runner.link, 'emit').mockImplementation(async (...arguments_) => {
    await emit(...arguments_)
    const [event] = arguments_
    if (
      event.type === 'files.snapshot' &&
      event.tree.revision === 2 &&
      event.tree.partNumber === 1
    ) {
      firstPart.resolve()
      await release.promise
    }
  })
  const scan = runner.files.refresh.bind(runner.files)
  vi.spyOn(runner.files, 'refresh').mockImplementation((...arguments_) => {
    const action = scan(...arguments_)
    const [full] = arguments_
    if (!full) monitored.resolve()
    return action
  })
  h.endpoint.send(refresh('files.snapshot', 'large-tree'))
  try {
    await firstPart.promise
    await repository.write(
      'watch-trigger',
      'The monitor must queue its scan.\n',
    )
    await monitored.promise
    h.endpoint.send(refresh('files.snapshot', 'second-tree'))
    h.endpoint.send(refresh('changes.updated', 'first-changes'))
    h.endpoint.send(refresh('changes.updated', 'second-changes'))
    await runner.link.idle()
    expect(
      h.endpoint.runnerEvents.slice(3).map(({ event }) => event.type),
    ).toEqual(['files.snapshot'])
  } finally {
    release.resolve()
  }
  await runner.idle()
  const trees = h.endpoint.runnerEvents.flatMap(
    ({ event }): (string | number)[][] => {
      if (event.type === 'files.snapshot')
        return [
          [
            event.type,
            event.tree.revision,
            event.tree.partNumber,
            event.tree.partCount,
          ],
        ]
      if (event.type === 'files.changed')
        return [[event.type, event.delta.revision, event.delta.changes.length]]
      return []
    },
  )
  expect(trees).toEqual([
    ['files.snapshot', 1, 1, 1],
    ['files.snapshot', 2, 1, 3],
    ['files.snapshot', 2, 2, 3],
    ['files.snapshot', 2, 3, 3],
    ['files.changed', 3, 2],
    ['files.changed', 4, 2],
    ['files.changed', 5, 3],
    ['files.snapshot', 6, 1, 3],
    ['files.snapshot', 6, 2, 3],
    ['files.snapshot', 6, 3, 3],
  ])
  const changes = h.endpoint.runnerEvents.flatMap(({ event }) =>
    event.type === 'changes.updated' ? [event.changes] : [],
  )
  expect(
    changes.map(({ revision, partNumber, partCount }) => [
      revision,
      partNumber,
      partCount,
    ]),
  ).toEqual([
    [1, 1, 1],
    [2, 1, 1],
    [3, 1, 3],
    [3, 2, 3],
    [3, 3, 3],
    [4, 1, 3],
    [4, 2, 3],
    [4, 3, 3],
  ])
  expect(
    changes.filter((part) => part.revision === 3).flatMap((part) => part.files),
  ).toEqual(large.changes.files)
  expect(
    changes
      .filter((part) => part.revision === 4)
      .map((part) => [part.baseBranch, part.summary]),
  ).toEqual([
    ['main', { files: 6, added: 6, removed: 0 }],
    ['main', { files: 6, added: 6, removed: 0 }],
    ['main', { files: 6, added: 6, removed: 0 }],
  ])
  expect(
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'files.snapshot' && event.tree.revision === 2
        ? event.tree.entries
        : [],
    ),
  ).toEqual(large.entries)
  expect(
    h.endpoint.runnerEvents.flatMap(({ event }) =>
      event.type === 'files.changed' ? event.delta.changes : [],
    ),
  ).toEqual([
    ...large.entries.map(({ path }) => ({ operation: 'remove', path })),
    {
      operation: 'upsert',
      entry: {
        path: 'monitor-file',
        name: 'file',
        kind: 'file',
        change: 'untracked',
      },
    },
  ])
  expect(h.store.snapshot.fileRevisions).toEqual({ tree: 6, changes: 4 })
  expect(h.warnings).toEqual([])
})
