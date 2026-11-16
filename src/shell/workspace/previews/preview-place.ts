import type {
  WorkspaceTab,
  WorkspaceView,
} from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { toolPlace } from '../tools/tool-address'

/** A Preview tab of the saved view. */
export type PreviewTab = Extract<WorkspaceTab, { kind: 'preview' }>

/** Whether a tab of the saved view is a Preview tab. */
export function isPreviewTab(tab: WorkspaceTab | null): tab is PreviewTab {
  return tab?.kind === 'preview'
}

/**
 * The port whose Preview tab the address shows, or null. Only the desktop
 * has Preview tabs: there `preview/port/<port>` shows the tab of the port.
 * A phone shows the Preview page at that address, and an archived
 * workspace has no previews.
 */
export function previewTabPort(context: WorkspaceContext): number | null {
  if (context.viewport === 'phone' || context.sandbox === 'archived') {
    return null
  }
  const place = toolPlace(context.view)
  return place?.tool === 'preview' ? place.port : null
}

/** The Preview tabs of a view, in the order of the tab row. */
export function previewTabsOf(view: WorkspaceView | null): PreviewTab[] {
  return (view?.tabs ?? []).filter(isPreviewTab)
}

/**
 * The view with the Preview tab of a port open and active: a port with a
 * tab keeps its place, and another port opens at the end of the row. A view
 * that shows the tab already stays the same object, so nothing saves.
 */
export function withPreviewTab(
  view: WorkspaceView,
  port: number,
): WorkspaceView {
  const open = previewTabsOf(view).find((tab) => tab.port === port)
  const active = view.activeTab
  if (open && isPreviewTab(active) && active.port === port) return view
  const tab: PreviewTab = open ?? { kind: 'preview', port }
  return {
    ...view,
    tabs: open ? view.tabs : [...view.tabs, tab],
    activeTab: tab,
  }
}

/**
 * The view without the Preview tab of a port. `next` becomes the active
 * tab when the closed tab was active.
 */
export function withoutPreviewTab(
  view: WorkspaceView,
  port: number,
  next: WorkspaceTab | null,
): WorkspaceView {
  const closed = (tab: WorkspaceTab | null) =>
    isPreviewTab(tab) && tab.port === port
  return {
    ...view,
    tabs: view.tabs.filter((tab) => !closed(tab)),
    activeTab: closed(view.activeTab) ? next : view.activeTab,
  }
}
