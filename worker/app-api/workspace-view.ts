import type {
  TemporaryTab,
  WorkspaceTab,
  WorkspaceView,
} from '../../src/shared/workspace-view'
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
        open.kind !== 'session' && open.kind === tab.kind && open.path === path,
    )
      ? { kind: tab.kind, path }
      : null
  } catch {
    return null
  }
}

export function workspaceViewInput(value: unknown): WorkspaceView {
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
