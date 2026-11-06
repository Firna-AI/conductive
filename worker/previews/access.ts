import { API_PATHS } from '../../src/shared/api'
import { findMembership } from '../data/orgs'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { ProviderError } from '../sandbox/errors'
import { gate } from '../security/gate'
import type { ToolDependencies, WorkspaceTarget } from './types'

export async function workspaceTarget(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
  userId?: string,
): Promise<WorkspaceTarget> {
  if (userId && !(await findMembership(env.DB, orgId, userId))) {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  const row = await env.DB.prepare(
    `SELECT w.org_id AS orgId, w.id AS workspaceId, w.sandbox_id AS sandboxId, w.state
     FROM workspaces w JOIN orgs o ON o.id = w.org_id
     WHERE w.org_id = ? AND w.id = ? AND w.archived_at IS NULL AND o.deleted_at IS NULL`,
  )
    .bind(orgId, workspaceId)
    .first<WorkspaceTarget>()
  if (!row)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return row
}

export function requireRunning(target: WorkspaceTarget): void {
  if (
    !target.sandboxId ||
    !['ready', 'working', 'unread'].includes(target.state)
  ) {
    throw new HttpError(
      409,
      'sandbox_not_ready',
      'Open the workspace to start its cloud computer.',
    )
  }
}

export async function verifyTarget(
  env: AppEnv,
  target: WorkspaceTarget,
  userId?: string,
  running = true,
): Promise<void> {
  const current = await workspaceTarget(
    env,
    target.orgId,
    target.workspaceId,
    userId,
  )
  if (!current.sandboxId || current.sandboxId !== target.sandboxId) {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  if (running) requireRunning(current)
}

export async function toolRequest(
  request: Request,
  env: AppEnv,
  now: number,
  tool: 'terminal' | 'previews' | 'desktop',
) {
  const context = await gate(request, env, now)
  const path = new URL(request.url).pathname
  const parts = path.slice(API_PATHS.orgs.length + 1).split('/')
  if (
    !path.startsWith(`${API_PATHS.orgs}/`) ||
    parts[1] !== 'workspaces' ||
    parts[3] !== tool ||
    parts.length > 5
  ) {
    throw new HttpError(404, 'not_found', 'The page is not available.')
  }
  let orgId: string
  let workspaceId: string
  let tail: string | null
  try {
    orgId = decodeURIComponent(parts[0])
    workspaceId = decodeURIComponent(parts[2])
    tail = parts[4] === undefined ? null : decodeURIComponent(parts[4])
  } catch {
    throw new HttpError(404, 'not_found', 'The page is not available.')
  }
  const target = await workspaceTarget(env, orgId, workspaceId, context.user.id)
  return { context, target, tail }
}

export async function recordActivity(
  env: AppEnv,
  dependencies: ToolDependencies,
  workspaceId: string,
  source: 'terminal' | 'preview',
): Promise<void> {
  await env.DB.prepare(
    `UPDATE workspaces SET last_activity_at = MAX(COALESCE(last_activity_at, 0), ?)
     WHERE id = ? AND archived_at IS NULL`,
  )
    .bind(dependencies.now(), workspaceId)
    .run()
  await dependencies.onActivity?.(workspaceId, source)
}

export function toolError(error: unknown): Response {
  return privateResponse(
    errorResponse(
      error instanceof ProviderError
        ? new HttpError(
            502,
            'sandbox_unavailable',
            'The cloud computer did not answer. Try again.',
          )
        : error,
    ),
  )
}
