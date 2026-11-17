import {
  isTabPort,
  type TemporaryTab,
  type WorkspaceTab,
  type WorkspaceView,
} from '../../shared/workspace-view'
import {
  viewFromWire,
  type PreviewTabPlace,
} from '../../shared/workspace-view-wire'
import {
  count,
  isRecord,
  list,
  nullable,
  oneOf,
  optional,
  record,
  text,
  UnreadableResponse,
} from './json'

function readTab(value: unknown): WorkspaceTab {
  const source = record(value, 'tab')
  switch (source.kind) {
    case 'session':
      return { kind: 'session', sessionId: text(source.sessionId) }
    case 'diff':
      return { kind: 'diff', path: text(source.path) }
    case 'preview':
      if (!isTabPort(source.port)) throw new UnreadableResponse('port')
      return { kind: 'preview', port: source.port }
    default:
      return {
        kind: oneOf({ file: true })(source.kind),
        path: text(source.path),
        mode: oneOf({ preview: true, source: true })(source.mode),
      }
  }
}

function readTemporaryTab(
  value: unknown,
  tabs: readonly WorkspaceTab[],
): TemporaryTab | null {
  if (
    !isRecord(value) ||
    (value.kind !== 'file' && value.kind !== 'diff') ||
    typeof value.path !== 'string' ||
    !value.path
  )
    return null
  return tabs.some(
    (tab) =>
      (tab.kind === 'file' || tab.kind === 'diff') &&
      tab.kind === value.kind &&
      tab.path === value.path,
  )
    ? { kind: value.kind, path: value.path }
    : null
}

/** A Preview tab of the route: its port and its place in the row. */
function readPreviewPlace(value: unknown): PreviewTabPlace {
  const place = record(value, 'preview tab')
  if (!isTabPort(place.port)) throw new UnreadableResponse('port')
  return { port: place.port, place: count(place.place) }
}

/**
 * The saved view from the shape of the route, as `WorkspaceViewWire` says:
 * the tabs, with each Preview tab at its place in the row.
 */
export function readView(value: unknown): WorkspaceView {
  const view = record(record(value, 'view response').view, 'view')
  const tabs = list(readTab)(view.tabs)
  const activePreview = optional(nullable(count))(view.activePreview) ?? null
  if (activePreview !== null && !isTabPort(activePreview)) {
    throw new UnreadableResponse('port')
  }
  return viewFromWire(
    {
      tabs,
      activeTab: nullable(readTab)(view.activeTab),
      temporaryTab: readTemporaryTab(view.temporaryTab, tabs),
      fileList: oneOf({ all: true, changes: true, checks: true })(
        view.fileList,
      ),
      tool: oneOf({ terminal: true, preview: true, desktop: true })(view.tool),
    },
    optional(list(readPreviewPlace))(view.previewTabs) ?? [],
    activePreview,
  )
}
