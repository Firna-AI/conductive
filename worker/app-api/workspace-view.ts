import {
  isTabPort,
  type TemporaryTab,
  type WorkspaceTab,
  type WorkspaceView,
} from '../../src/shared/workspace-view'
import {
  viewFromWire,
  type PreviewTabPlace,
} from '../../src/shared/workspace-view-wire'
import { identifier, record } from '../chat/inputs'
import { HttpError } from '../http'
import { activeOrgIdPredicate } from '../data/org-access'
import { requireActiveOrg } from '../data/user-access'

function invalidView(): never {
  throw new HttpError(
    400,
    'invalid_input',
    'Check the workspace view and try again.',
  )
}

function viewTab(value: unknown): WorkspaceTab {
  const tab = record(value)
  if (tab.kind === 'session')
    return { kind: 'session', sessionId: identifier(tab.sessionId) }
  if (tab.kind === 'diff') return { kind: 'diff', path: identifier(tab.path) }
  if (tab.kind === 'file' && (tab.mode === 'preview' || tab.mode === 'source'))
    return { kind: 'file', path: identifier(tab.path), mode: tab.mode }
  if (tab.kind === 'preview' && isTabPort(tab.port))
    return { kind: 'preview', port: tab.port }
  return invalidView()
}

function temporaryTab(
  value: unknown,
  tabs: readonly WorkspaceTab[],
): TemporaryTab | null {
  try {
    const tab = record(value)
    if (tab.kind !== 'file' && tab.kind !== 'diff') return null
    const path = identifier(tab.path)
    return tabs.some(
      (open) =>
        (open.kind === 'file' || open.kind === 'diff') &&
        open.kind === tab.kind &&
        open.path === path,
    )
      ? { kind: tab.kind, path }
      : null
  } catch {
    return null
  }
}

function workspaceViewInput(value: unknown): WorkspaceView {
  const view = record(value)
  if (
    !Array.isArray(view.tabs) ||
    (view.fileList !== 'all' &&
      view.fileList !== 'changes' &&
      view.fileList !== 'checks') ||
    (view.tool !== 'terminal' &&
      view.tool !== 'preview' &&
      view.tool !== 'desktop')
  )
    return invalidView()
  const tabs = view.tabs.map(viewTab)
  return {
    tabs,
    activeTab: view.activeTab === null ? null : viewTab(view.activeTab),
    temporaryTab: temporaryTab(view.temporaryTab, tabs),
    fileList: view.fileList,
    tool: view.tool,
  }
}

/** The Preview tabs of a save, each with a port and a place in the row. */
function previewPlaces(value: unknown): PreviewTabPlace[] {
  if (!Array.isArray(value)) return invalidView()
  return value.map((item: unknown) => {
    const place = record(item)
    if (
      !isTabPort(place.port) ||
      typeof place.place !== 'number' ||
      !Number.isSafeInteger(place.place) ||
      place.place < 0
    )
      return invalidView()
    return { port: place.port, place: place.place }
  })
}

/**
 * A save of the view route, as `WorkspaceViewWire` says. A save without
 * `previewTabs` comes from an older copy of the app, which knows no Preview
 * tab. It keeps `stored`, the Preview tabs of the saved view, at their
 * places, so an older copy erases no Preview tab.
 */
export function workspaceViewSave(
  value: unknown,
  stored: readonly PreviewTabPlace[],
): WorkspaceView {
  const body = record(value)
  const base = workspaceViewInput(body)
  const places =
    body.previewTabs === undefined ? stored : previewPlaces(body.previewTabs)
  const active = body.activePreview ?? null
  if (active !== null && !isTabPort(active)) return invalidView()
  return viewFromWire(base, places, active)
}

/** Whether a save of the view route comes from an older copy of the app. */
export function keepsStoredPreviewTabs(value: unknown): boolean {
  return record(value).previewTabs === undefined
}

export async function savedWorkspaceView(
  db: D1Database,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceView> {
  const row = await db
    .prepare(
      'SELECT view_json AS viewJson FROM workspace_views WHERE workspace_id = ? AND user_id = ?',
    )
    .bind(workspaceId, userId)
    .first<{ viewJson: string }>()
  if (!row)
    return {
      tabs: [],
      activeTab: null,
      temporaryTab: null,
      fileList: 'all',
      tool: 'terminal',
    }
  const value: unknown = JSON.parse(row.viewJson)
  return workspaceViewInput(value)
}

export async function saveWorkspaceView(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    userId: string
    view: WorkspaceView
    now: number
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO workspace_views (workspace_id, org_id, user_id, view_json, updated_at)
     SELECT ?, ?, ?, ?, ? WHERE ${activeOrgIdPredicate('?')}
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET
     view_json = excluded.view_json, updated_at = excluded.updated_at`,
    )
    .bind(
      input.workspaceId,
      input.orgId,
      input.userId,
      JSON.stringify(input.view),
      input.now,
      input.orgId,
    )
    .run()
  await requireActiveOrg(db, input.orgId)
}
