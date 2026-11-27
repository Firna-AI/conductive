import { expect, it } from 'vitest'

import type { BranchChangedFile } from './generated/BranchChangedFile'
import type { ChangesDelta } from './generated/ChangesDelta'
import { readChangesDeltaPaths } from './changes-delta-paths'

const file: BranchChangedFile = {
  path: 'file.txt',
  change: 'modified',
  added: 1,
  removed: 0,
  uncommitted: true,
}
const upsert = { index: 0, file }
const other = { ...file, path: 'other.txt' }
const header = {
  revision: 2,
  baseBranch: 'main',
  summary: { files: 1, added: 1, removed: 0 },
  omitted: { files: 0, added: 0, removed: 0 },
} satisfies Omit<ChangesDelta, 'removes' | 'upserts'>

it.each([
  {
    operations: 'two removes of one path',
    removes: ['file.txt', 'file.txt'],
    upserts: [],
    paths: null,
  },
  {
    operations: 'two upserts of one path',
    removes: [],
    upserts: [upsert, { index: 1, file }],
    paths: null,
  },
  {
    operations: 'a remove and an upsert of one path',
    removes: ['file.txt'],
    upserts: [upsert],
    paths: null,
  },
  {
    operations: 'two upserts with equal indexes',
    removes: [],
    upserts: [upsert, { index: 0, file: other }],
    paths: null,
  },
  {
    operations: 'a rename that also removes its previous path',
    removes: ['other.txt'],
    upserts: [
      {
        index: 0,
        file: {
          ...file,
          change: 'renamed' as const,
          previousPath: 'other.txt',
        },
      },
    ],
    paths: new Set(['other.txt', 'file.txt']),
  },
])('reads paths for $operations', ({ removes, upserts, paths }) => {
  expect(readChangesDeltaPaths({ ...header, removes, upserts })).toEqual(paths)
})
