import { expect, it } from 'vitest'
import { moveTab, tabKey } from './tab-order'
import type { WorkspaceView } from '../../shared/workspace-view'

it('gives each port one Preview tab key', () => {
  expect(tabKey({ kind: 'preview', port: 3000 })).toBe('preview:3000')
  expect(tabKey({ kind: 'preview', port: 3000 })).not.toBe(
    tabKey({ kind: 'preview', port: 6006 }),
  )
  expect(tabKey({ kind: 'preview', port: 3000 })).not.toBe(
    tabKey({ kind: 'file', path: '3000', mode: 'source' }),
  )
})

it('moves a Preview tab beside a session', () => {
  const session = { kind: 'session', sessionId: 'one' } as const
  const preview = { kind: 'preview', port: 3000 } as const
  const view: WorkspaceView = {
    tabs: [session, preview],
    activeTab: null,
    temporaryTab: null,
    fileList: 'all',
    tool: 'terminal',
  }
  const moved = moveTab(view, view.tabs, preview, { before: session })
  expect(moved.tabs).toEqual([preview, session])
})
