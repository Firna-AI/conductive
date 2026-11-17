import { expect, it } from 'vitest'
import type { WorkspaceView } from '../../shared/workspace-view'
import { rowTabs } from './tab-order'
import {
  withSessionPlace,
  withSessionPlaces,
  withSessionTabAt,
} from './session-tab-places'
import { newSessionRecord } from './test-kit'

const choice = {
  agent: 'claude',
  model: 'model',
  effort: 'high',
  fast: false,
} as const
const first = { kind: 'session', sessionId: 'first' } as const
const second = { kind: 'session', sessionId: 'second' } as const
const added = { kind: 'session', sessionId: 'added' } as const
const file = { kind: 'file', path: 'file.ts', mode: 'source' } as const
const left = {
  tabs: [first, file],
  activeTab: first,
  temporaryTab: { kind: 'file', path: 'file.ts' } as const,
}
const right = { tabs: [second], activeTab: second, temporaryTab: null }
const view: WorkspaceView = {
  panes: [left, right],
  focusedPane: 1,
  fileList: 'all',
  tool: 'terminal',
}
const sessions = [
  newSessionRecord('first', choice),
  newSessionRecord('second', choice),
]

it('draws the focused row without appending sessions from the other pane', () => {
  expect(rowTabs(view, sessions, true)).toEqual([second])
  expect(rowTabs({ ...view, focusedPane: 0 }, sessions, false)).toEqual([first])
})

it('appends new sessions to the focused pane while keeping each existing place and temporary mark', () => {
  expect(withSessionPlace(view, 'first')).toBe(view)
  expect(withSessionPlace(view, 'added')).toEqual({
    ...view,
    panes: [left, { ...right, tabs: [second, added] }],
  })
  expect(
    withSessionPlaces(view, [...sessions, newSessionRecord('added', choice)]),
  ).toEqual({
    ...view,
    panes: [left, { ...right, tabs: [second, added] }],
  })
})

it('removes a closed sessions empty pane during a list read and keeps new sessions in the remaining pane', () => {
  expect(
    withSessionPlaces(view, [sessions[0], newSessionRecord('added', choice)]),
  ).toEqual({
    ...view,
    panes: [{ ...left, tabs: [first, file, added] }],
    focusedPane: 0,
  })
})

it('restores a failed close to its own row and recreates an emptied pane without moving the current focus', () => {
  const remaining: WorkspaceView = { ...view, panes: [left], focusedPane: 0 }
  expect(withSessionTabAt(remaining, 'second', 0, 1, 2)).toEqual({
    ...view,
    panes: [left, { ...right, activeTab: null }],
    focusedPane: 0,
  })
  expect(withSessionTabAt(view, 'added', 0, 0, 2)).toEqual({
    ...view,
    panes: [{ ...left, tabs: [added, first, file] }, right],
  })
})
