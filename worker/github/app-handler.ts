import {
  type GitHubBannerResponse,
  type GitHubChecksResponse,
  type GitHubStoredResponse,
} from '../../src/shared/github'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import { queueBarState, queueLeaveBase } from '../merge-queue/read'
import type {
  GitHubRefreshWorkspace,
  GitHubSnapshot,
  GitHubStoredState,
  GitHubWorkspace,
} from './contracts'
import { activeWorkspace } from './data'
import { githubFailure } from './parsers'
import { githubBranchLabels } from './output'

export interface GitHubAppDependencies {
  now: () => number
  refresh: GitHubRefreshWorkspace
  stored: GitHubStoredState
}

/**
 * The stored state of the current branch, or null. A state of an earlier
 * branch, such as the merged branch before Continue, does not apply.
 */
async function storedBody(
  env: AppEnv,
  workspace: GitHubWorkspace,
  stored: GitHubSnapshot | undefined,
): Promise<GitHubStoredResponse> {
  if (!stored || stored.banner.branch !== workspace.branch)
    return { state: null }
  const labels = await githubBranchLabels(env, workspace)
  return { state: { banner: labels(stored.banner), checks: stored.checks } }
}

async function readBody(
  env: AppEnv,
  workspace: GitHubWorkspace,
  route: string | undefined,
  userId: string,
  dependencies: GitHubAppDependencies,
) {
  if (route === '/stored') {
    const stored = await dependencies.stored(workspace)
    return {
      ...(await storedBody(env, workspace, stored)),
      ...(await readQueueBar(env, workspace, stored)),
    }
  }
  const snapshot = await dependencies.refresh(workspace, { userId })
  if (snapshot === null) throw githubFailure()
  if (route === '/checks') return snapshot.checks satisfies GitHubChecksResponse
  const [labels, queueBar] = await Promise.all([
    githubBranchLabels(env, workspace),
    readQueueBar(env, workspace, snapshot),
  ])
  return {
    banner: labels(snapshot.banner),
    ...queueBar,
  } satisfies GitHubBannerResponse
}

async function readQueueBar(
  env: AppEnv,
  workspace: GitHubWorkspace,
  snapshot: GitHubSnapshot | undefined,
) {
  const current =
    snapshot?.banner.branch === workspace.branch ? snapshot : undefined
  const queue = await queueBarState(env.DB, workspace, current)
  if (queue) return { queue }
  const base = await queueLeaveBase(env.DB, workspace, current)
  if (!base || !current) return {}
  const labels = await githubBranchLabels(env, workspace)
  const labeled = labels({ ...current.banner, baseBranch: base })
  return { queueLeave: { baseBranch: labeled.displayBaseBranch ?? base } }
}

/** App endpoint. This handler owns its gate. Do not gate the same request twice. */
export async function handleGitHubRead(
  request: Request,
  env: AppEnv,
  dependencies: GitHubAppDependencies,
): Promise<Response> {
  try {
    const context = await gate(request, env, dependencies.now())
    const path = new URL(request.url).pathname
    const match = path.match(
      /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/github(\/checks|\/stored)?$/,
    )
    if (
      !context.org ||
      !match ||
      !['GET', 'HEAD'].includes(request.method) ||
      request.headers.has('Upgrade')
    ) {
      throw new HttpError(404, 'not_found', 'The page is not available.')
    }
    let workspaceId: string
    try {
      workspaceId = decodeURIComponent(match[1])
    } catch {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    const workspace = await activeWorkspace(
      env.DB,
      workspaceId,
      context.org.id,
      context.user.id,
    )
    if (!workspace)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    const body = await readBody(
      env,
      workspace,
      match[2],
      context.user.id,
      dependencies,
    )
    return privateResponse(
      request.method === 'HEAD' ? new Response(null) : Response.json(body),
    )
  } catch (error) {
    return privateResponse(errorResponse(error, request))
  }
}
