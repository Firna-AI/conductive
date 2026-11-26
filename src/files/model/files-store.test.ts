import { expect, it, onTestFinished } from 'vitest'
import { filePaths, type FileEvent } from '../../shared/files'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import type { FilesSubscribe } from './files-store'
import {
  deferred,
  emptyChanges,
  envelopeAfter,
  filesFor,
  observeFileReads,
  startFiles,
  waitUntil,
  slow,
} from '../files-test-kit'

const org = FAKE_IDS.org
const id = FAKE_IDS.workspace

function paths(files: ReturnType<typeof filesFor>): string[] {
  return [...(files.getSnapshot().tree?.entries.keys() ?? [])]
}

it(
  'applies the recorded creation, move, removal, totals, and unpushed commits after the route reads',
  slow,
  async () => {
    const server = new FakeApiServer()
    const files = filesFor(server)
    await startFiles(files)
    const snapshot = files.getSnapshot()
    expect(snapshot.tree?.revision).toBe(2)
    expect(paths(files)).toEqual(
      expect.arrayContaining(['notes.txt', 'docs', 'docs/README.md']),
    )
    expect(paths(files)).not.toContain('README.md')
    expect(paths(files)).not.toContain('.env.example')
    expect(snapshot.changes?.summary).toEqual({
      files: 7,
      added: 161,
      removed: 50,
    })
    expect(snapshot.changes).toMatchObject({ unpushedCommits: 2 })
    expect(
      snapshot.changes?.files.find((file) => file.path === 'docs/README.md'),
    ).toMatchObject({ change: 'renamed', previousPath: 'README.md' })
  },
)

it.each(['tree', 'changes'] as const)(
  'uses both cutoffs and keeps the newer changes when %s answers first',
  async (first) => {
    const data = toolFixtures()
    const changes = {
      ...emptyChanges,
      unpushedCommits: 7,
      uncommittedFileCount: 4,
    }
    const at = (eventNumber: number, event: FileEvent) => ({
      workspaceId: id,
      eventNumber,
      occurredAt: FAKE_TIME,
      event,
    })
    const events = new FakeWorkspaceEvents([
      at(11, { type: 'files.snapshot', tree: { ...data.files, revision: 3 } }),
      at(12, { type: 'changes.updated', changes: data.changes }),
      at(13, { type: 'changes.updated', changes: data.changes }),
    ])
    const after: number[] = []
    let replay = () => {}
    const replies = {
      tree: deferred<Response>(),
      changes: deferred<Response>(),
    }
    const reads = observeFileReads(
      (cursor, listener) => {
        after.push(cursor)
        return events.subscribe(
          cursor,
          (message) => {
            replay = () => listener(message)
          },
          id,
        )
      },
      (input) =>
        replies[input === filePaths.tree(org, id) ? 'tree' : 'changes'].promise,
    )
    const { files } = reads
    onTestFinished(() => files.stop())
    const answers = {
      tree: {
        ...data.files,
        stateRead: { eventNumber: 10, repositoryId: null, failure: null },
      },
      changes: {
        ...changes,
        stateRead: { eventNumber: 13, repositoryId: null, failure: null },
      },
    }

    files.start()
    const started = [reads.tree.length, reads.changes.length]
    replies[first].resolve(Response.json(answers[first]))
    await reads[first][0]
    const beforeBoth = [...after]
    const second = first === 'tree' ? 'changes' : 'tree'
    replies[second].resolve(Response.json(answers[second]))
    await reads[second][0]
    replay()
    const { tree, changes: shown } = files.getSnapshot()

    expect({
      started,
      beforeBoth,
      after,
      revision: tree?.revision,
      shown,
    }).toEqual({
      started: [1, 1],
      beforeBoth: [],
      after: [10],
      revision: 3,
      shown: changes,
    })
  },
)

it(
  'skips a repeated event and reads the missed events again after a gap',
  slow,
  async () => {
    const server = new FakeApiServer()
    const after: number[] = []
    const cutoff = server.events.last(id)
    let dropped = false
    // An adapter that loses the first live event, as a dropped socket would.
    const subscribe: FilesSubscribe = (afterEventNumber, listener) => {
      after.push(afterEventNumber)
      return server.events.subscribe(afterEventNumber, (message) => {
        if (message.type === 'event' && !dropped) {
          dropped = true
          return
        }
        listener(message)
      })
    }
    const files = filesFor(server, subscribe)
    await startFiles(files)
    const entry = { name: 'a.ts', kind: 'file', change: 'added' } as const
    const first = envelopeAfter(server, {
      type: 'files.changed',
      delta: {
        revision: 3,
        changes: [{ operation: 'upsert', entry: { ...entry, path: 'a.ts' } }],
      },
    })
    server.events.emit(first)
    const second = envelopeAfter(server, {
      type: 'files.changed',
      delta: {
        revision: 4,
        changes: [{ operation: 'upsert', entry: { ...entry, path: 'b.ts' } }],
      },
    })
    server.events.emit(second)
    // The last number again, with other content: the store keeps the first.
    server.events.emit({
      ...second,
      event: {
        type: 'files.changed',
        delta: {
          revision: 5,
          changes: [{ operation: 'remove', path: 'b.ts' }],
        },
      },
    })
    expect(after).toEqual([cutoff, first.eventNumber - 1])
    expect(paths(files)).toEqual(expect.arrayContaining(['a.ts', 'b.ts']))
    expect(files.getSnapshot().tree?.revision).toBe(4)
  },
)

it(
  'keeps the tree of the stream when an older route read answers later',
  slow,
  async () => {
    const server = new FakeApiServer()
    const treeReply = deferred<Response>()
    let treeReads = 0
    const fetch = async (input: string, init?: RequestInit) => {
      if (input !== filePaths.tree(org, id)) return server.fetch(input, init)
      treeReads += 1
      return treeReads === 1
        ? Response.json(
            { error: { code: 'file_unavailable' } },
            { status: 503 },
          )
        : treeReply.promise
    }
    // The first read failed, and the replay arrives while its retry waits.
    let deliver = () => {}
    const subscribe: FilesSubscribe = (after, listener) =>
      server.events.subscribe(after, (message) => {
        if (message.type === 'history') deliver = () => listener(message)
        else listener(message)
      })
    const files = filesFor(server, subscribe, fetch)
    await startFiles(files)
    files.retry()
    deliver()
    expect(files.getSnapshot().tree?.revision).toBe(2)
    const shown = files.getSnapshot()
    treeReply.resolve(Response.json(toolFixtures().files))
    await waitUntil(() => expect(files.getSnapshot()).not.toBe(shown))
    expect(files.getSnapshot().tree?.revision).toBe(2)
    expect(paths(files)).toContain('docs/README.md')
    expect(paths(files)).not.toContain('README.md')
  },
)

it(
  'reads the tree route again when an update skips a revision',
  slow,
  async () => {
    const server = new FakeApiServer()
    server.json('GET', filePaths.tree(org, id), toolFixtures().files)
    const files = filesFor(server, (after, listener) =>
      server.events.subscribe(
        Math.max(after, server.events.history().throughEventNumber),
        listener,
      ),
    )
    await startFiles(files)
    expect(files.getSnapshot().tree?.revision).toBe(1)
    server.json('GET', filePaths.tree(org, id), {
      ...toolFixtures().files,
      revision: 2,
    })
    server.events.emit(
      envelopeAfter(server, {
        type: 'files.changed',
        delta: {
          revision: 3,
          changes: [
            {
              operation: 'upsert',
              entry: {
                path: 'c.ts',
                name: 'c.ts',
                kind: 'file',
                change: 'added',
              },
            },
          ],
        },
      }),
    )
    await waitUntil(() => expect(files.getSnapshot().tree?.revision).toBe(3))
    const treeReads = server.requests.filter(
      (request) => new URL(request.url).pathname === filePaths.tree(org, id),
    )
    expect(treeReads).toHaveLength(2)
    expect(paths(files)).toContain('c.ts')
  },
)
