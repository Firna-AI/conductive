import { expect, it } from 'vitest'
import type { BranchChangedFile } from '../../shared/generated/BranchChangedFile'
import type { BrowserChangesResponse } from '../../shared/generated/BrowserChangesResponse'
import { emptyChanges } from '../files-test-kit'
import {
  changesPath,
  delta,
  row,
  startChanges,
  zero,
} from './files-changes.test-support'

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

it('takes a full event and its next delta while an older recovery read waits', async () => {
  const initial = {
    ...emptyChanges,
    revision: 6,
    files: [row('keep.ts')],
    summary: { files: 1, added: 1, removed: 0 },
  }
  const { files, changes, emit, held, reply, nextNumber } =
    await startChanges(initial)
  const oldCutoff = nextNumber()
  reply({ ...initial, revision: 8, unpushedCommits: 8 }, oldCutoff)
  held.holdAnswer('GET', changesPath)
  emit(delta(8, { summary: initial.summary }))
  emit(delta(9, { summary: initial.summary }))
  expect(changes).toHaveLength(2)

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
  held.release('GET', changesPath)
  const older = await changes[1]
  expect(older.stateRead?.eventNumber).toBe(oldCutoff)
  expect(files.getSnapshot().changes).toBe(after.changes)
  expect(changes).toHaveLength(2)
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

it('applies queued changes in revision order after the recovery read cutoff', async () => {
  const { files, changes, emit, held, reply, nextNumber } = await startChanges({
    ...emptyChanges,
    revision: 2,
  })
  const saved = files.getSnapshot().changes
  const older = { ...emptyChanges, revision: 4, unpushedCommits: 4 }
  reply(older, nextNumber())
  held.holdAnswer('GET', changesPath)
  emit(delta(4))
  const summary = { files: 1, added: 1, removed: 0 }
  emit(delta(5, { summary, upserts: [{ index: 0, file: row('first.ts') }] }))
  emit(
    delta(6, {
      summary,
      removes: ['first.ts'],
      upserts: [{ index: 0, file: row('newest.ts') }],
      unpushedCommits: 6,
    }),
  )

  expect(changes).toHaveLength(2)
  expect(files.getSnapshot().changes).toBe(saved)
  held.hold('GET', changesPath)
  held.release('GET', changesPath)
  await changes[1]
  const newest = {
    ...emptyChanges,
    revision: 6,
    files: [row('newest.ts')],
    summary,
    unpushedCommits: 6,
    omitted: zero,
  }
  expect(files.getSnapshot().changes).toEqual(newest)
  expect(changes).toHaveLength(2)

  emit(delta(7, { summary, unpushedCommits: 7 }))
  expect(files.getSnapshot().changes).toEqual({
    ...newest,
    revision: 7,
    unpushedCommits: 7,
  })
  expect(changes).toHaveLength(2)
})
