import type {
  WorkspaceTab,
  WorkspaceView,
} from '../../../shared/workspace-view'
import type { DocumentTab } from './document-address'

/** Whether a tab of the view shows this old session from Conductor. */
function isDocumentTab(tab: WorkspaceTab | null, documentId: string): boolean {
  return tab?.kind === 'conductor-document' && tab.documentId === documentId
}

/**
 * The view with the tab of this old session open and active, at the end of
 * the row when it was not open. A view that shows it already stays the
 * same object, so nothing saves.
 */
export function withDocumentTab(
  view: WorkspaceView,
  tab: DocumentTab,
): WorkspaceView {
  const open = view.tabs.some((item) => isDocumentTab(item, tab.documentId))
  if (open && isDocumentTab(view.activeTab, tab.documentId)) return view
  return {
    ...view,
    tabs: open ? view.tabs : [...view.tabs, tab],
    activeTab: tab,
  }
}

/**
 * The view without the tab of this old session. When it was the active
 * tab, `next` becomes the active tab.
 */
export function withoutDocumentTab(
  view: WorkspaceView,
  documentId: string,
  next: WorkspaceTab | null,
): WorkspaceView {
  const tabs = view.tabs.filter((tab) => !isDocumentTab(tab, documentId))
  if (tabs.length === view.tabs.length) return view
  const closedActive = isDocumentTab(view.activeTab, documentId)
  return { ...view, tabs, activeTab: closedActive ? next : view.activeTab }
}
