import {
  type GitHubBannerResponse,
  type GitHubChecksResponse,
  type GitHubStoredResponse,
} from '../../src/shared/github'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import type {
  GitHubRefreshWorkspace,
  GitHubSnapshot,
  GitHubStoredState,
  GitHubWorkspace,
} from './contracts'
import { activeWorkspace } from './data'
import { githubFailure } from './parsers'

export interface GitHubAppDependencies {
  now: () => number
  refresh: GitHubRefreshWorkspace
  stored: GitHubStoredState
}

/**
 * The stored state of the current branch, or null. A state of an earlier
 * branch, such as the merged branch before Continue, does not apply.
 */
function storedBody(
  workspace: GitHubWorkspace,
  stored: GitHubSnapshot | undefined,
): GitHubStoredResponse {
  if (!stored || stored.banner.branch !== workspace.branch)
    return { state: null }
  return { state: { banner: stored.banner, checks: stored.checks } }
}

async function readBody(
  workspace: GitHubWorkspace,
  route: string | undefined,
  userId: string,
  dependencies: GitHubAppDependencies,
) {
  if (route === '/stored')
    return storedBody(workspace, await dependencies.stored(workspace))
  const snapshot = await dependencies.refresh(workspace, { userId })
  if (snapshot === null) throw githubFailure()
  return route === '/checks'
    ? (snapshot.checks satisfies GitHubChecksResponse)
    : ({ banner: snapshot.banner } satisfies GitHubBannerResponse)
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
      workspace,
      match[2],
      context.user.id,
      dependencies,
    )
    return privateResponse(
      request.method === 'HEAD' ? new Response(null) : Response.json(body),
    )
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
