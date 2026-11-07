import { expect, it } from 'vitest'

import type { FileEvent } from '../../src/shared/files'
import { parseFileEvent } from './parsers'

it('preserves legal Git names in file snapshots, deltas, and branch changes', () => {
  const paths = [
    'tab\tname.txt',
    'line\nname.txt',
    'back\\slash.txt',
    ' ',
    'control-\u0001.txt',
    `long/${'x'.repeat(600)}`,
  ]
  const entries = paths.map((path) => ({
    path,
    name: path,
    kind: 'file' as const,
    change: null,
  }))
  const events: FileEvent[] = [
    { type: 'files.snapshot', tree: { revision: 1, entries } },
    {
      type: 'files.changed',
      delta: {
        revision: 2,
        changes: [
          ...entries.map((entry) => ({ operation: 'upsert' as const, entry })),
          ...paths.map((path) => ({ operation: 'remove' as const, path })),
          ...entries.map((entry) => ({
            operation: 'move' as const,
            previousPath: entry.path,
            entry: { ...entry, path: `moved/${entry.path}` },
          })),
        ],
      },
    },
    {
      type: 'changes.updated',
      changes: {
        baseBranch: 'main',
        files: paths.map((path) => ({
          path: `moved/${path}`,
          previousPath: path,
          change: 'renamed' as const,
          added: 0,
          removed: 0,
          uncommitted: true,
        })),
        summary: { files: 6, added: 0, removed: 0 },
      },
    },
  ]
  for (const event of events) {
    expect(() => parseFileEvent(event), event.type).not.toThrow()
    expect(parseFileEvent(event)).toEqual(event)
  }
})

it('refuses NUL and empty, dot, and dotdot slash segments in file reports', () => {
  for (const path of [
    '',
    'nul\0.txt',
    '/file.txt',
    'dir//file.txt',
    './file.txt',
    'dir/./file.txt',
    'dir/../file.txt',
    'file.txt/',
    '.',
    '..',
  ]) {
    expect(
      () =>
        parseFileEvent({
          type: 'files.snapshot',
          tree: {
            revision: 1,
            entries: [{ path, name: path, kind: 'file', change: null }],
          },
        }),
      JSON.stringify(path),
    ).toThrow('The file could not be read. Try again.')
  }
})
