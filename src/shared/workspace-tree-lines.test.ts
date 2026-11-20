import { expect, it } from 'vitest'

import { placeWorkspaces, type TreeWorkspace } from './workspace-tree'
import { treeLines } from './workspace-tree-lines'

const sections = [{ id: 'general', position: 0, isDefault: true }]

function row(
  id: string,
  parentId: string | null,
  createdAt: number,
  state: TreeWorkspace['state'] = 'ready',
): TreeWorkspace {
  return { id, parentId, sectionId: 'general', state, createdAt }
}

/**
 * The rows that the list shows, as a file tree draws them: for each outer
 * column, │ where its line runs on or a blank where it ended, then ├─ or └─
 * for a nested row, the workspace, and ╷ for the stub under the mark of a
 * row that has rows under it.
 */
function drawn(workspaces: readonly TreeWorkspace[]): string[] {
  const rows = placeWorkspaces(workspaces, sections)
  const lines = treeLines(rows)
  return rows.map((shown, index) => {
    const { last, through, hasNested } = lines[index]
    const outer = through.map((runs) => (runs ? '│  ' : '   ')).join('')
    const own = shown.parentId === null ? '' : last ? '└─ ' : '├─ '
    return `${outer}${own}${shown.workspace.id}${hasNested ? ' ╷' : ''}`
  })
}

it('draws ├─ for a nested row with a later row under its parent, and └─ for the last one', () => {
  expect(
    drawn([
      row('alone', null, 1),
      row('parent', null, 2),
      row('second', 'parent', 4),
      row('first', 'parent', 3),
      row('next', null, 5),
    ]),
  ).toEqual(['alone', 'parent ╷', '├─ first', '└─ second', 'next'])
})

it('puts a stub under a nested row with rows under it, and runs an outer line on only while its row has a later nested row', () => {
  expect(
    drawn([
      row('root', null, 1),
      row('a', 'root', 2),
      row('a-1', 'a', 3),
      row('a-2', 'a', 4),
      row('b', 'root', 5),
      row('b-1', 'b', 6),
    ]),
  ).toEqual([
    'root ╷',
    '├─ a ╷',
    '│  ├─ a-1',
    '│  └─ a-2',
    '└─ b ╷',
    '   └─ b-1',
  ])
})

it('draws a tree down to depth 3, where the line of column 0 runs on after the line of column 1 ends', () => {
  expect(
    drawn([
      row('autocomplete', null, 1),
      row('search-api', 'autocomplete', 2),
      row('places-client', 'search-api', 3),
      row('suggestions', 'autocomplete', 4),
      row('rate-limits', 'places-client', 5),
      row('load-test', 'places-client', 6),
    ]),
  ).toEqual([
    'autocomplete ╷',
    '├─ search-api ╷',
    '│  └─ places-client ╷',
    '│     ├─ rate-limits',
    '│     └─ load-test',
    '└─ suggestions',
  ])
})

it('follows the rows that the list shows after an Archive, so a row under its grandparent joins the line of its new siblings', () => {
  expect(
    drawn([
      row('root', null, 1),
      row('archived', 'root', 2, 'archived'),
      row('child', 'archived', 3),
      row('grandchild', 'child', 4),
      row('sibling', 'root', 5),
    ]),
  ).toEqual(['root ╷', '├─ child ╷', '│  └─ grandchild', '└─ sibling'])
})
