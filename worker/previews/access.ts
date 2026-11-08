import { API_PATHS } from '../../src/shared/api'
import type { AppEnv } from '../env'
import { suspendedWorkspaceOwnerError } from '../data/user-access'
import { errorResponse, HttpError, privateResponse } from '../http'
import { ProviderError } from '../sandbox/errors'
import { gate } from '../security/gate'
import type { ToolDependencies, WorkspaceTarget } from './types'
import {
  readWorkspaceTarget,
  writeWorkspaceActivity,
  type WorkspaceAccessTarget,
} from './workspace-store'

export async function workspaceTarget(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
  userId?: string,
): Promise<WorkspaceAccessTarget> {
  const row = await readWorkspaceTarget(env.DB, orgId, workspaceId, userId)
  if (!row)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return row
}

export function requireRunning(target: WorkspaceAccessTarget): void {
  if (target.ownerActive !== 1) throw suspendedWorkspaceOwnerError()
  if (!target.sandboxId || target.sandboxAllowed !== 1) {
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
  if (current.ownerActive !== 1) throw suspendedWorkspaceOwnerError()
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
  await writeWorkspaceActivity(env.DB, workspaceId, dependencies.now())
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
