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
import { requireActiveOrg } from '../data/user-access'
import { isTerminalId } from '../../src/shared/terminal'
import {
  withWorkspaceSkills,
  workspaceSkillPatch,
} from './workspace-view-skills'
import { SAVE_WORKSPACE_VIEW } from './workspace-view-sql'

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
    ...(isTerminalId(view.terminal) ? { terminal: view.terminal } : {}),
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

function workspaceViewPatch(value: unknown) {
  const body = record(value)
  const base = workspaceViewInput(body)
  const keepsPreviews = body.previewTabs === undefined
  const places = keepsPreviews ? [] : previewPlaces(body.previewTabs)
  const activePreview = body.activePreview ?? null
  if (activePreview !== null && !isTabPort(activePreview)) return invalidView()
  const skills = workspaceSkillPatch(body) ?? invalidView()
  return {
    keepsPreviews,
    activePreview,
    patch: {
      ...viewFromWire(base, places, activePreview),
      ...skills,
      terminal: base.terminal ?? null,
    },
  }
}

function readSavedView(json: string): WorkspaceView {
  const value = record(JSON.parse(json))
  const base = workspaceViewInput(value)
  const skillBase = Array.isArray(value.skillBaseTabs)
    ? value.skillBaseTabs.map((tab: unknown) =>
        tab === null ? null : viewTab(tab),
      )
    : base.tabs
  return withWorkspaceSkills(base, value, skillBase) ?? invalidView()
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
  return readSavedView(row.viewJson)
}

export async function saveWorkspaceView(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    userId: string
    view: unknown
    now: number
  },
): Promise<WorkspaceView> {
  const { patch, keepsPreviews, activePreview } = workspaceViewPatch(input.view)
  const row = await db
    .prepare(SAVE_WORKSPACE_VIEW)
    .bind(
      input.workspaceId,
      input.orgId,
      input.userId,
      JSON.stringify(patch),
      input.now,
      keepsPreviews ? 1 : 0,
      activePreview,
    )
    .first<{ viewJson: string }>()
  await requireActiveOrg(db, input.orgId)
  if (!row) throw new Error('The workspace view write returned no row.')
  return readSavedView(row.viewJson)
}
