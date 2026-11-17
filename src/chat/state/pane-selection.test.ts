import { describe, expect, it } from 'vitest'
import type { WorkspaceView } from '../../shared/workspace-view'
import { initialSnapshot } from './chat-snapshot'
import { sessionTarget } from './pane-selection'

const left = { kind: 'session', sessionId: 'left' } as const
const right = { kind: 'session', sessionId: 'right' } as const
const file = { kind: 'file', path: 'left.ts', mode: 'source' } as const
const diff = { kind: 'diff', path: 'right.ts' } as const
const view = {
  panes: [
    { tabs: [left, file], activeTab: left, temporaryTab: null },
    { tabs: [right, diff], activeTab: right, temporaryTab: null },
  ],
  focusedPane: 0,
  fileList: 'all',
  tool: 'terminal',
} satisfies WorkspaceView

describe('the session target of panes', () => {
  it('uses the focused session, then the other shown session, then the last session of either row', () => {
    const snapshot = { ...initialSnapshot, view }
    expect(sessionTarget(snapshot)).toBe('left')
    expect(
      sessionTarget({ ...snapshot, view: { ...view, focusedPane: 1 } }),
    ).toBe('right')
    const files = {
      ...view,
      panes: [
        { ...view.panes[0], activeTab: file },
        { ...view.panes[1], activeTab: diff },
      ],
    } satisfies WorkspaceView
    expect(
      sessionTarget({
        ...snapshot,
        view: { ...files, panes: [files.panes[0], view.panes[1]] },
      }),
    ).toBe('right')
    expect(sessionTarget({ ...snapshot, view: files })).toBe('left')
    expect(
      sessionTarget({ ...snapshot, view: { ...files, focusedPane: 1 } }),
    ).toBe('right')
    expect(
      sessionTarget({
        ...snapshot,
        view: {
          ...files,
          panes: [{ ...files.panes[0], tabs: [file] }, files.panes[1]],
        },
      }),
    ).toBe('right')
    expect(
      sessionTarget({
        ...snapshot,
        view: {
          ...files,
          panes: [
            { ...files.panes[0], tabs: [file] },
            { ...files.panes[1], tabs: [diff] },
          ],
        },
      }),
    ).toBeNull()
  })
})
