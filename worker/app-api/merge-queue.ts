import { mergeQueuePaths } from '../../src/shared/merge-queue'
import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import type { AppEnv } from '../env'
import { requireFeatureResult } from '../features/result'
import { readMergeWorkspace } from '../github/merge-access'
import { HttpError } from '../http'
import type { QueueMemberAction } from '../merge-queue/contracts'
import { queueObject } from '../merge-queue/wake'
import type { RequestContext } from '../security/gate'
import { workspaceChildId } from './workspace-path'

function parseAction(
  request: Request,
  context: RequestContext,
  orgId: string,
  workspaceId: string,
) {
  const path = new URL(request.url).pathname
  if (path === mergeQueuePaths.entry(orgId, workspaceId)) {
    if (request.method === 'POST')
      return { kind: 'add' } satisfies QueueMemberAction
    if (request.method === 'DELETE')
      return { kind: 'remove' } satisfies QueueMemberAction
  }
  if (
    path === mergeQueuePaths.merge(orgId, workspaceId) &&
    request.method === 'POST'
  ) {
    const { ahead, stackCount, headSha, pullNumber } = context.body ?? {}
    if (
      stackCount === undefined &&
      typeof ahead === 'number' &&
      Number.isSafeInteger(ahead) &&
      ahead >= 0
    )
      return { kind: 'merge', ahead } satisfies QueueMemberAction
    if (
      ahead === undefined &&
      typeof stackCount === 'number' &&
      Number.isSafeInteger(stackCount) &&
      stackCount >= 2 &&
      typeof pullNumber === 'number' &&
      Number.isSafeInteger(pullNumber) &&
      pullNumber > 0 &&
      isGitCommitOid(headSha)
    )
      return {
        kind: 'merge-stack',
        stackCount,
        headSha,
        pullNumber,
      } satisfies QueueMemberAction
    throw new HttpError(
      400,
      'invalid_input',
      'Review the merge queue and try again.',
    )
  }
  if (
    path === mergeQueuePaths.order(orgId, workspaceId) &&
    request.method === 'PUT'
  ) {
    const beforeWorkspaceId = context.body?.beforeWorkspaceId
    if (
      beforeWorkspaceId !== null &&
      (typeof beforeWorkspaceId !== 'string' || !beforeWorkspaceId)
    )
      throw new HttpError(
        400,
        'invalid_input',
        'Choose a place in the merge queue and try again.',
      )
    return { kind: 'reorder', beforeWorkspaceId } satisfies QueueMemberAction
  }
  return null
}

export async function mergeQueueRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
): Promise<Response | null> {
  if (!context.org || request.headers.has('Upgrade')) return null
  const { id: orgId } = context.org
  const workspaceId = workspaceChildId(new URL(request.url).pathname, orgId)
  if (!workspaceId) return null
  const action = parseAction(request, context, orgId, workspaceId)
  if (!action) return null
  const memberId = context.user.id
  const workspace = await readMergeWorkspace(
    env.DB,
    orgId,
    workspaceId,
    memberId,
  )
  const scope = { orgId, githubRepositoryId: workspace.repositoryId }
  requireFeatureResult(
    await queueObject(env, scope).changeMergeQueue(
      scope,
      workspaceId,
      memberId,
      action,
    ),
  )
  const merging = action.kind === 'merge' || action.kind === 'merge-stack'
  return new Response(null, { status: merging ? 202 : 204 })
}
