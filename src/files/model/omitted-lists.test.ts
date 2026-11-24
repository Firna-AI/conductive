import { expect, it, onTestFinished } from 'vitest'
import type { FileEntry } from '../../shared/generated/FileEntry'
import type { FileResponse } from '../../shared/generated/FileResponse'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import {
  envelopeAfter,
  filesFor,
  observeFileReads,
  slow,
  startFiles,
  waitUntil,
} from '../files-test-kit'
import type { FilesSubscribe } from './files-store'
import { followPath } from './follow-path'
import { ResourceLoader } from './resource-loader'

// The lists of a limited report: their omitted totals, and the refresh of
// an open file whose path the tree leaves out.

const { org, workspace: id } = FAKE_IDS

function envelope(eventNumber: number, event: WorkspaceEvent) {
  return { workspaceId: id, eventNumber, occurredAt: FAKE_TIME, event }
}

type TreeChanges = Extract<
  WorkspaceEvent,
  { type: 'files.changed' }
>['delta']['changes']

function delta(
  revision: number,
  changes: TreeChanges,
  omittedEntryCount?: number,
): WorkspaceEvent {
  return {
    type: 'files.changed',
    delta: {
      revision,
      ...(omittedEntryCount === undefined ? {} : { omittedEntryCount }),
      changes,
    },
  }
}

it('keeps the omitted totals of each list from reads, history, and live reports, until a full report replaces them', async () => {
  const data = toolFixtures()
  const omitted = { files: 1_243, added: 31_004, removed: 9_877 }
  const zero = { files: 0, added: 0, removed: 0 }
  const notes: FileEntry = {
    path: 'notes.md',
    name: 'notes.md',
    kind: 'file',
    change: 'untracked',
  }
  const cutoff = (eventNumber: number) => ({
    eventNumber,
    repositoryId: null,
    failure: null,
  })
  let send: Parameters<FilesSubscribe>[1] = () => {}
  const after: number[] = []
  // No tree is saved yet, so its read is a 503 with a cutoff, and the
  // stream gives the tree. The changes read gives the saved list.
  const reads = observeFileReads(
    (cursor, listener) => {
      after.push(cursor)
      send = listener
      return () => {}
    },
    async (input) =>
      input === filePaths.tree(org, id)
        ? Response.json(
            { error: { code: 'file_unavailable' }, stateRead: cutoff(4) },
            { status: 503 },
          )
        : Response.json({ ...data.changes, omitted, stateRead: cutoff(6) }),
  )
  const { files } = reads
  onTestFinished(() => files.stop())
  files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  const seen: unknown[] = []
  const note = (step: string) => {
    const { tree, treeUnavailable, changes } = files.getSnapshot()
    seen.push({
      step,
      entries: tree ? (tree.omittedEntryCount ?? 'unknown') : 'no tree',
      treeUnavailable,
      changes: changes ? (changes.omitted ?? 'unknown') : 'no list',
    })
  }
  note('reads')
  const limited = { ...data.files, omittedEntryCount: 18_412 }
  send({
    type: 'history',
    history: {
      events: [
        envelope(5, { type: 'files.snapshot', tree: limited }),
        envelope(6, delta(2, [{ operation: 'upsert', entry: notes }])),
      ],
      throughEventNumber: 6,
    },
  })
  note('history')
  const live = (eventNumber: number, event: WorkspaceEvent, step: string) => {
    send({ type: 'event', envelope: envelope(eventNumber, event) })
    note(step)
  }
  const remove = { operation: 'remove', path: 'notes.md' } as const
  live(7, delta(3, [remove], 18_413), 'swap')
  // An update with an explicit zero clears a positive count. The count
  // then rises again, so the full report below still replaces a count.
  live(8, delta(4, [], 0), 'zero update')
  live(9, delta(5, [], 18_000), 'count only')
  live(10, { type: 'files.unavailable' }, 'mark')
  live(
    11,
    { type: 'changes.updated', changes: { ...data.changes, omitted: zero } },
    'changes zero',
  )
  live(
    12,
    { type: 'files.snapshot', tree: { ...data.files, omittedEntryCount: 0 } },
    'tree zero',
  )
  live(13, { type: 'files.snapshot', tree: data.files }, 'older tree')
  live(14, { type: 'changes.updated', changes: data.changes }, 'older list')

  const step = (
    name: string,
    entries: number | string,
    treeUnavailable: boolean,
    changes: unknown,
  ) => ({ step: name, entries, treeUnavailable, changes })
  expect({ after, seen }).toEqual({
    after: [4],
    seen: [
      step('reads', 'no tree', false, omitted),
      step('history', 18_412, false, omitted),
      step('swap', 18_413, false, omitted),
      step('zero update', 0, false, omitted),
      step('count only', 18_000, false, omitted),
      step('mark', 18_000, true, omitted),
      step('changes zero', 18_000, true, zero),
      step('tree zero', 0, false, zero),
      step('older tree', 'unknown', false, zero),
      step('older list', 'unknown', false, 'unknown'),
    ],
  })
})

it(
  'reads an open file that the tree leaves out again after a remove of its absent path, and after a full tree',
  slow,
  async () => {
    const server = new FakeApiServer()
    const path = 'tests/fixtures/addresses/zz/9999.json'
    const content = filePaths.content(org, id, path)
    const reply = (text: string): FileResponse => ({
      path,
      mediaType: 'application/json',
      sizeBytes: text.length,
      encoding: 'utf-8',
      content: text,
    })
    server.json('GET', content, reply('{"city":"Wien"}'))
    const files = filesFor(server)
    onTestFinished(() => files.stop())
    await startFiles(files)
    const listed = files.getSnapshot().tree
    // A file tab reads its path directly, also a path outside the tree.
    const loader = new ResourceLoader((key, signal) =>
      files.client.readFile(key, signal),
    )
    onTestFinished(followPath(files, loader, path))
    const shows = (text: string) =>
      waitUntil(() => {
        expect(loader.getSnapshot()).toMatchObject({
          status: 'ready',
          refreshing: false,
          value: { content: text },
        })
      })
    await shows('{"city":"Wien"}')

    server.json('GET', content, reply('{"city":"Graz"}'))
    const revision = (listed?.revision ?? 0) + 1
    const remove = { operation: 'remove', path } as const
    const refresh: WorkspaceEvent = {
      type: 'files.changed',
      delta: { revision, changes: [remove] },
    }
    server.events.emit(envelopeAfter(server, refresh))
    await shows('{"city":"Graz"}')
    const refreshed = files.getSnapshot().tree
    expect({
      revision: refreshed?.revision,
      entries: [...(refreshed?.entries.keys() ?? [])],
    }).toEqual({
      revision,
      entries: [...(listed?.entries.keys() ?? [])],
    })

    server.json('GET', content, reply('{"city":"Linz"}'))
    const tree = { ...toolFixtures().files, omittedEntryCount: 18_412 }
    server.events.emit(envelopeAfter(server, { type: 'files.snapshot', tree }))
    await shows('{"city":"Linz"}')
  },
)
