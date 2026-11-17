import { expect, it } from 'vitest'
import type { WorkspacePane, WorkspaceView } from '../../shared/workspace-view'
import { moveTab } from './tab-order'

const first = { kind: 'session', sessionId: 'first' } as const
const second = { kind: 'session', sessionId: 'second' } as const
const third = { kind: 'session', sessionId: 'third' } as const
const file = { kind: 'file', path: 'file.ts', mode: 'source' } as const
const diff = { kind: 'diff', path: 'file.ts' } as const
const mark = { kind: 'file', path: 'file.ts' } as const
const left: WorkspacePane = {
  tabs: [first, file, second],
  activeTab: file,
  temporaryTab: mark,
}
const right: WorkspacePane = {
  tabs: [third, diff],
  activeTab: third,
  temporaryTab: diff,
}
const split: WorkspaceView = {
  panes: [left, right],
  focusedPane: 0,
  fileList: 'all',
  tool: 'terminal',
}
const single: WorkspaceView = { ...split, panes: [left] }

it('moves inside a row without changing either selection, and keeps a moved temporary tab', () => {
  expect(moveTab(split, file, { pane: 0, place: { after: second } })).toEqual({
    ...split,
    panes: [
      { ...left, tabs: [first, second, file], temporaryTab: null },
      right,
    ],
  })
  expect(moveTab(split, first, { pane: 0, place: { after: second } })).toEqual({
    ...split,
    panes: [{ ...left, tabs: [file, second, first] }, right],
  })
})

it('moves to a place in the other row, shows and focuses the moved tab, and keeps both panes temporary rules', () => {
  expect(moveTab(split, file, { pane: 1, place: { before: diff } })).toEqual({
    ...split,
    panes: [
      { tabs: [first, second], activeTab: second, temporaryTab: null },
      { ...right, tabs: [third, file, diff], activeTab: file },
    ],
    focusedPane: 1,
  })
})

it('moves an unshown tab to the end of the other row without changing its source selection', () => {
  expect(moveTab(split, first, { pane: 1, place: 'end' })).toEqual({
    ...split,
    panes: [
      { ...left, tabs: [file, second] },
      { ...right, tabs: [third, diff, first], activeTab: first },
    ],
    focusedPane: 1,
  })
})

it('opens a new pane on either side and leaves the previous tab shown in the old pane', () => {
  const remaining = {
    tabs: [first, second],
    activeTab: second,
    temporaryTab: null,
  }
  const opened = { tabs: [file], activeTab: file, temporaryTab: null }
  expect(moveTab(single, file, { newPane: 'left' })).toEqual({
    ...single,
    panes: [opened, remaining],
    focusedPane: 0,
  })
  expect(moveTab(single, file, { newPane: 'right' })).toEqual({
    ...single,
    panes: [remaining, opened],
    focusedPane: 1,
  })
})

it('closes the emptied pane on either side and fixes the focused pane index', () => {
  expect(
    moveTab(
      {
        ...split,
        panes: [{ tabs: [first], activeTab: first, temporaryTab: null }, right],
      },
      first,
      { pane: 1, place: 'end' },
    ),
  ).toEqual({
    ...split,
    panes: [{ ...right, tabs: [third, diff, first], activeTab: first }],
    focusedPane: 0,
  })
  expect(
    moveTab(
      {
        ...split,
        panes: [left, { tabs: [third], activeTab: third, temporaryTab: null }],
      },
      third,
      { pane: 0, place: 'end' },
    ),
  ).toEqual({
    ...split,
    panes: [{ ...left, tabs: [first, file, second, third], activeTab: third }],
    focusedPane: 0,
  })
})

it('selects the previous source tab when the moved shown tab was last', () => {
  expect(
    moveTab(
      { ...split, panes: [{ ...left, activeTab: second }, right] },
      second,
      { pane: 1, place: 'end' },
    ).panes[0].activeTab,
  ).toEqual(file)
})

it('returns the same view for unchanged or invalid moves, so a temporary mark stays and nothing saves', () => {
  const only: WorkspaceView = {
    ...single,
    panes: [{ tabs: [file], activeTab: file, temporaryTab: mark }],
  }
  expect(moveTab(only, file, { newPane: 'left' })).toBe(only)
  expect(moveTab(split, file, { newPane: 'right' })).toBe(split)
  expect(moveTab(single, file, { pane: 1, place: 'end' })).toBe(single)
  expect(moveTab(split, file, { pane: 0, place: { before: second } })).toBe(
    split,
  )
  expect(moveTab(split, file, { pane: 0, place: { after: file } })).toBe(split)
  expect(moveTab(single, file, { pane: 0, place: { before: third } })).toBe(
    single,
  )
  expect(moveTab(single, third, { pane: 0, place: 'end' })).toBe(single)
})
