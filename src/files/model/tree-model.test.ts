import { expect, it } from 'vitest'
import type { FileEntry } from '../../shared/generated/FileEntry'
import { applyTreeDelta, treeFromSnapshot } from './tree-model'

function file(path: string): FileEntry {
  return {
    path,
    name: path.slice(path.lastIndexOf('/') + 1),
    kind: 'file',
    change: null,
  }
}

it('keeps every entry on a remove of a path that the tree does not hold, also each entry under that path, and touches the path', () => {
  // A tree can hold the entries of a folder that it lacks, and All files
  // draws that folder from their paths.
  const entries = [file('vendor/a.js'), file('vendor/b.js'), file('keep.md')]
  const removed = applyTreeDelta(treeFromSnapshot({ revision: 1, entries }), {
    revision: 2,
    changes: [{ operation: 'remove', path: 'vendor' }],
  })
  expect({
    entries: [...removed.tree.entries.values()],
    touched: removed.touched,
  }).toEqual({ entries, touched: new Set(['vendor']) })
})
