import { expect, it, onTestFinished } from 'vitest'
import { HeldRequests } from '../../app/test-kit'
import type { WorkspaceEvent } from '../../shared/events'
import { filePaths } from '../../shared/files'
import type { BranchChangedFile } from '../../shared/generated/BranchChangedFile'
import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import type { ChangesDelta } from '../../shared/generated/ChangesDelta'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { nextEnvelope } from '../../test-support/recorded-repairs'
import { emptyChanges, observeFileReads } from '../files-test-kit'

const { org, workspace: id } = FAKE_IDS
const changesPath = filePaths.changes(org, id)
const zero = { files: 0, added: 0, removed: 0 }

function row(path: string): BranchChangedFile {
  return { path, change: 'modified', uncommitted: true, added: 1, removed: 0 }
}

function delta(revision: number, fields: Partial<ChangesDelta> = {}) {
  return {
    type: 'changes.changed',
    delta: {
      revision,
      baseBranch: 'main',
      summary: zero,
      omitted: zero,
      removes: [],
      upserts: [],
      ...fields,
    },
  } satisfies WorkspaceEvent
}

async function startChanges(initial: BrowserChangesResponse) {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const reads = observeFileReads(
    (cursor, listener) => server.events.subscribe(cursor, listener, id),
    held.fetch,
  )
  function reply(
    list: BrowserChangesResponse,
    eventNumber = server.events.last(id),
  ) {
    server.json('GET', changesPath, {
      ...list,
      stateRead: { eventNumber, repositoryId: null, failure: null },
    })
  }
  function emit(event: WorkspaceEvent) {
    const envelope = nextEnvelope(server.events, event, FAKE_TIME)
    server.events.emit(envelope)
  }
  onTestFinished(() => {
    reads.files.stop()
    held.release('GET', changesPath)
    held.release('GET', changesPath)
  })
  reply(initial)
  reads.files.start()
  await Promise.all([reads.tree[0], reads.changes[0]])
  return {
    ...reads,
    emit,
    held,
    reply,
    nextNumber: () => server.events.last(id) + 1,
  }
}

it('inserts changes by index and touches only removed, upserted, and renamed paths', async () => {
  const initial: BrowserChangesResponse = {
    ...emptyChanges,
    revision: 4,
    files: [
      { ...row('drop.ts'), change: 'renamed', previousPath: 'dropped-from.ts' },
      row('keep.ts'),
      {
        ...row('update.ts'),
        change: 'renamed',
        previousPath: 'updated-from.ts',
      },
    ],
    summary: { files: 3, added: 3, removed: 0 },
    displayBaseBranch: 'old label',
    unpushedCommits: 3,
    uncommittedFileCount: 7,
  }
  const { files, changes, emit } = await startChanges(initial)
  const before = files.getSnapshot()
  const rename: BranchChangedFile = {
    ...row('z.ts'),
    change: 'renamed',
    added: 2,
    removed: 1,
    displayPath: 'masked.ts',
    previousPath: 'original.ts',
    previousDisplayPath: 'masked-original.ts',
  }
  const updated = { ...row('update.ts'), added: 3 }
  const added = { ...row('a.ts'), change: 'added' } as const
  emit(
    delta(5, {
      displayBaseBranch: 'new label',
      unpushedCommits: 0,
      summary: { files: 4, added: 7, removed: 1 },
      omitted: { files: 9, added: 10, removed: 11 },
      removes: ['drop.ts'],
      upserts: [
        { index: 0, file: rename },
        { index: 2, file: updated },
        { index: 3, file: added },
      ],
    }),
  )

  const after = files.getSnapshot()
  expect(after.changes).toEqual({
    revision: 5,
    baseBranch: 'main',
    displayBaseBranch: 'new label',
    unpushedCommits: 0,
    summary: { files: 4, added: 7, removed: 1 },
    omitted: { files: 9, added: 10, removed: 11 },
    files: [rename, row('keep.ts'), updated, added],
  })
  expect(after.epoch).toBe(before.epoch)
  expect(after.versions).toEqual(
    new Map([
      ['drop.ts', 1],
      ['dropped-from.ts', 1],
      ['updated-from.ts', 1],
      ['z.ts', 1],
      ['original.ts', 1],
      ['update.ts', 1],
      ['a.ts', 1],
    ]),
  )
  expect(changes).toHaveLength(1)
})

it('updates the header without touching paths after a full event starts a new revision', async () => {
  const initial = {
    ...emptyChanges,
    revision: 6,
    files: [row('keep.ts')],
    summary: { files: 1, added: 1, removed: 0 },
  }
  const { files, changes, emit } = await startChanges(initial)
  const full = { ...initial, revision: 1, unpushedCommits: 2 }
  emit({ type: 'changes.updated', changes: full })
  const before = files.getSnapshot()
  emit(
    delta(2, {
      summary: { files: 1, added: 1, removed: 0 },
      unpushedCommits: 1,
      omitted: { files: 3, added: 4, removed: 5 },
    }),
  )

  const after = files.getSnapshot()
  expect(after.changes).toEqual({
    ...initial,
    revision: 2,
    unpushedCommits: 1,
    omitted: { files: 3, added: 4, removed: 5 },
  })
  expect(after.epoch).toBe(before.epoch)
  expect(after.versions).toBe(before.versions)
  expect(changes).toHaveLength(1)
})

it.each([
  { label: 'an unknown revision', initial: emptyChanges, update: delta(2) },
  {
    label: 'a remove of a missing path',
    initial: { ...emptyChanges, revision: 1 },
    update: delta(2, { removes: ['missing.ts'] }),
  },
  {
    label: 'an index outside the list',
    initial: { ...emptyChanges, revision: 1 },
    update: delta(2, {
      upserts: [{ index: 1, file: row('new.ts') }],
      summary: { files: 1, added: 1, removed: 0 },
    }),
  },
  {
    label: 'a negative index',
    initial: { ...emptyChanges, revision: 1 },
    update: delta(2, {
      upserts: [{ index: -1, file: row('new.ts') }],
      summary: { files: 1, added: 1, removed: 0 },
    }),
  },
])(
  'keeps the list and reads it again after $label',
  async ({ initial, update }) => {
    const { files, tree, changes, emit, held, reply, nextNumber } =
      await startChanges(initial)
    const saved = files.getSnapshot().changes
    expect(saved).toEqual(initial)
    const fresh = { ...emptyChanges, revision: 2, unpushedCommits: 4 }
    reply(fresh, nextNumber())
    held.holdAnswer('GET', changesPath)
    emit(update)

    expect(files.getSnapshot().changes).toBe(saved)
    expect(changes).toHaveLength(2)
    expect(tree).toHaveLength(1)
    held.release('GET', changesPath)
    await changes[1]
    expect(files.getSnapshot().changes).toEqual(fresh)
    expect(changes).toHaveLength(2)
  },
)

it('keeps the list after a revision gap until a read covers the newest rejected delta', async () => {
  const { files, changes, emit, held, reply, nextNumber } = await startChanges({
    ...emptyChanges,
    revision: 2,
  })
  const saved = files.getSnapshot().changes
  const older = { ...emptyChanges, revision: 4, unpushedCommits: 4 }
  reply(older, nextNumber())
  held.holdAnswer('GET', changesPath)
  emit(delta(4))
  const newest = { ...emptyChanges, revision: 5, unpushedCommits: 5 }
  reply(newest, nextNumber())
  held.holdAnswer('GET', changesPath)
  emit(delta(5))

  expect(changes).toHaveLength(2)
  expect(files.getSnapshot().changes).toBe(saved)
  held.release('GET', changesPath)
  await changes[1]
  expect(changes).toHaveLength(3)
  expect(files.getSnapshot().changes).toBe(saved)
  held.release('GET', changesPath)
  await changes[2]
  expect(files.getSnapshot().changes).toEqual(newest)

  emit(delta(6, { unpushedCommits: 6 }))
  expect(files.getSnapshot().changes).toEqual({
    ...newest,
    revision: 6,
    unpushedCommits: 6,
    omitted: zero,
  })
  expect(changes).toHaveLength(3)
})
