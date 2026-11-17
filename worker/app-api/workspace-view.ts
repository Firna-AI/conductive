import type {
  WorkspaceTab,
  WorkspaceView,
} from '../../src/shared/workspace-view'
import { readWorkspacePanes } from '../../src/shared/workspace-pane-input'
import { emptyPane } from '../../src/shared/workspace-panes'
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

export function workspaceViewInput(value: unknown): WorkspaceView {
  const view = record(value)
  if (
    (!Object.hasOwn(view, 'panes') && !Array.isArray(view.tabs)) ||
    (view.fileList !== 'all' &&
      view.fileList !== 'changes' &&
      view.fileList !== 'checks') ||
    (view.tool !== 'terminal' &&
      view.tool !== 'preview' &&
      view.tool !== 'desktop')
  )
    return invalidView()
  return {
    ...readWorkspacePanes(view, viewTab),
    fileList: view.fileList,
    tool: view.tool,
  }
}

export async function storedWorkspaceView(
  db: D1Database,
  workspaceId: string,
  userId: string,
): Promise<{ view: WorkspaceView; encoded: string | null }> {
  const row = await db
    .prepare(
      'SELECT view_json AS viewJson FROM workspace_views WHERE workspace_id = ? AND user_id = ?',
    )
    .bind(workspaceId, userId)
    .first<{ viewJson: string }>()
  if (!row)
    return {
      view: {
        panes: [emptyPane()],
        focusedPane: 0,
        fileList: 'all',
        tool: 'terminal',
      },
      encoded: null,
    }
  const value: unknown = JSON.parse(row.viewJson)
  return { view: workspaceViewInput(value), encoded: row.viewJson }
}

export async function savedWorkspaceView(
  db: D1Database,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceView> {
  return (await storedWorkspaceView(db, workspaceId, userId)).view
}

export async function saveWorkspaceView(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    userId: string
    view: WorkspaceView
    now: number
    expectedView?: string | null
  },
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO workspace_views (workspace_id, org_id, user_id, view_json, updated_at)
     SELECT ?, ?, ?, ?, ? WHERE ${activeOrgIdPredicate('?')}
     AND (? = 0 OR (SELECT view_json FROM workspace_views
       WHERE workspace_id = ? AND user_id = ?) IS ?)
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
      input.expectedView === undefined ? 0 : 1,
      input.workspaceId,
      input.userId,
      input.expectedView ?? null,
    )
    .run()
  await requireActiveOrg(db, input.orgId)
  return result.meta.changes > 0
}
