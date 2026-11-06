import { expect, it } from 'vitest'
import type { FileEntry } from '../../shared/files'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { applyTreeDelta, treeFromSnapshot } from './tree-model'
import { treeRows } from './tree-rows'

const tree = treeFromSnapshot(toolFixtures().files)

function visible(folders: ReadonlyMap<string, boolean>, open: string | null) {
  return treeRows(tree, folders, open).map(
    (row) => `${'  '.repeat(row.depth)}${row.entry.name}`,
  )
}

it('opens the folders that hold changes, with folders first and names in reading order', () => {
  expect(visible(new Map(), null)).toEqual([
    '.github',
    'prisma',
    'public',
    'src',
    '  app',
    '    api',
    '    checkout',
    '      AddressForm.tsx',
    '      page.tsx',
    '      useAddressAutocomplete.ts',
    '    layout.tsx',
    '  lib',
    'tests',
    '  checkout',
    '    address.test.ts',
    '.env.example',
    'next.config.ts',
    'package.json',
    'README.md',
    'tsconfig.json',
  ])
})

it('closes and opens folders as the user toggles them, and opens the folders of the open file', () => {
  const folders = new Map([
    ['src', false],
    ['.github', true],
  ])
  const rows = visible(folders, 'prisma/schema.prisma')
  expect(rows.slice(0, 4)).toEqual(['.github', 'prisma', 'public', 'src'])
  expect(rows).not.toContain('  app')
  const withFile = treeRows(
    applyTreeDelta(tree, {
      revision: 2,
      changes: [
        {
          operation: 'upsert',
          entry: {
            path: 'prisma/schema.prisma',
            name: 'schema.prisma',
            kind: 'file',
            change: null,
          },
        },
      ],
    }).tree,
    folders,
    'prisma/schema.prisma',
  ).map((row) => row.entry.path)
  expect(withFile.slice(0, 3)).toEqual([
    '.github',
    'prisma',
    'prisma/schema.prisma',
  ])
})

it('moves and removes a folder with the entries inside it', () => {
  const entry = (path: string, kind: FileEntry['kind']): FileEntry => ({
    path,
    name: path.slice(path.lastIndexOf('/') + 1),
    kind,
    change: null,
  })
  const base = treeFromSnapshot({
    revision: 1,
    entries: [
      entry('docs', 'directory'),
      entry('docs/a.md', 'file'),
      entry('docs/old', 'directory'),
      entry('docs/old/b.md', 'file'),
      entry('keep.md', 'file'),
    ],
  })
  const moved = applyTreeDelta(base, {
    revision: 2,
    changes: [
      {
        operation: 'move',
        previousPath: 'docs',
        entry: entry('guide', 'directory'),
      },
    ],
  })
  expect([...moved.tree.entries.keys()].sort()).toEqual([
    'guide',
    'guide/a.md',
    'guide/old',
    'guide/old/b.md',
    'keep.md',
  ])
  expect(moved.touched).toEqual(
    new Set([
      'docs',
      'docs/a.md',
      'docs/old',
      'docs/old/b.md',
      'guide',
      'guide/a.md',
      'guide/old',
      'guide/old/b.md',
    ]),
  )
  const removed = applyTreeDelta(moved.tree, {
    revision: 3,
    changes: [{ operation: 'remove', path: 'guide/old' }],
  })
  expect([...removed.tree.entries.keys()].sort()).toEqual([
    'guide',
    'guide/a.md',
    'keep.md',
  ])
})
