import type { WorkspaceTab, WorkspaceView } from './workspace-view'

/** A Preview tab as the view route carries it: its port and its place. */
export interface PreviewTabPlace {
  port: number
  /** The index of the tab in the whole tab row, from 0. */
  place: number
}

/**
 * The saved view as the view route sends and takes it. Older copies of the
 * app, such as an older Mac app, read `tabs` and `activeTab` alone and
 * refuse a tab kind that they do not know. So these fields hold no Preview
 * tab. `previewTabs` and `activePreview` carry the Preview tabs, and older
 * copies ignore them. A save without `previewTabs` comes from an older copy,
 * and the Worker keeps the stored Preview tabs then.
 */
export interface WorkspaceViewWire extends Omit<
  WorkspaceView,
  'tabs' | 'activeTab'
> {
  tabs: readonly WorkspaceTab[]
  activeTab: WorkspaceTab | null
  previewTabs?: readonly PreviewTabPlace[]
  /** The port of the active Preview tab, or null. */
  activePreview?: number | null
}

/** The view as the view route sends it, with its Preview tabs apart. */
export function viewToWire(view: WorkspaceView): WorkspaceViewWire {
  const tabs: WorkspaceTab[] = []
  const previewTabs: PreviewTabPlace[] = []
  view.tabs.forEach((tab, place) => {
    if (tab.kind === 'preview') previewTabs.push({ port: tab.port, place })
    else tabs.push(tab)
  })
  const active = view.activeTab
  const preview = active?.kind === 'preview'
  return {
    ...view,
    tabs,
    activeTab: preview ? null : active,
    previewTabs,
    activePreview: preview ? active.port : null,
  }
}

/**
 * The view as the Worker sends it: without the two Preview fields when the
 * view has no Preview tab, so the reply keeps the shape of older Workers.
 * A save of the app always sends `previewTabs`, also an empty list, because
 * a save without it keeps the stored Preview tabs.
 */
export function viewReply(view: WorkspaceView): WorkspaceViewWire {
  const wire = viewToWire(view)
  if ((wire.previewTabs ?? []).length > 0) return wire
  return {
    tabs: wire.tabs,
    activeTab: wire.activeTab,
    temporaryTab: wire.temporaryTab,
    fileList: wire.fileList,
    tool: wire.tool,
  }
}

/**
 * The whole view from the fields of the route: each Preview tab at its
 * place in the row, or at the end when the row is shorter. A port keeps its
 * first tab. A Preview tab in `base.tabs` is not part of the format, so it
 * drops. The Preview tab of `activePreview` is active when it is open.
 */
export function viewFromWire(
  base: WorkspaceViewWire,
  previewTabs: readonly PreviewTabPlace[],
  activePreview: number | null,
): WorkspaceView {
  const tabs: WorkspaceTab[] = base.tabs.filter((tab) => tab.kind !== 'preview')
  const open = new Set<number>()
  const ordered = [...previewTabs].sort(
    (left, right) => left.place - right.place,
  )
  for (const { port, place } of ordered) {
    if (open.has(port)) continue
    open.add(port)
    tabs.splice(Math.min(place, tabs.length), 0, { kind: 'preview', port })
  }
  const baseActive = base.activeTab?.kind === 'preview' ? null : base.activeTab
  const activeTab: WorkspaceTab | null =
    activePreview !== null && open.has(activePreview)
      ? { kind: 'preview', port: activePreview }
      : baseActive
  return {
    tabs,
    activeTab,
    temporaryTab: base.temporaryTab,
    fileList: base.fileList,
    tool: base.tool,
  }
}
