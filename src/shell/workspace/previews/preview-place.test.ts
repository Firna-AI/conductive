import { expect, it } from 'vitest'
import type { WorkspaceView } from '../../../shared/workspace-view'
import { withoutPreviewTab, withPreviewTab } from './preview-place'

const session = { kind: 'session', sessionId: 'one' } as const
const view: WorkspaceView = {
  tabs: [session, { kind: 'preview', port: 3000 }],
  activeTab: session,
  temporaryTab: null,
  fileList: 'all',
  tool: 'preview',
}

it('opens a new port at the end of the row and shows it', () => {
  const opened = withPreviewTab(view, 6006)
  expect(opened.tabs).toEqual([...view.tabs, { kind: 'preview', port: 6006 }])
  expect(opened.activeTab).toEqual({ kind: 'preview', port: 6006 })
})

it('shows the tab of a port in its place, and keeps a shown tab as the same view', () => {
  const shown = withPreviewTab(view, 3000)
  expect(shown.tabs).toBe(view.tabs)
  expect(shown.activeTab).toEqual({ kind: 'preview', port: 3000 })
  expect(withPreviewTab(shown, 3000)).toBe(shown)
})

it('closes the tab of a port, and makes the next tab active only when it was active', () => {
  const shown = withPreviewTab(view, 3000)
  expect(withoutPreviewTab(shown, 3000, session)).toMatchObject({
    tabs: [session],
    activeTab: session,
  })
  expect(withoutPreviewTab(view, 3000, null)).toMatchObject({
    tabs: [session],
    activeTab: session,
  })
})
