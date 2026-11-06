import {
  type GitHubBannerResponse,
  type GitHubChecksResponse,
} from '../../src/shared/github'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import type { GitHubRefreshWorkspace } from './contracts'
import { activeWorkspace } from './data'
import { githubFailure } from './parsers'

export interface GitHubAppDependencies {
  now: () => number
  refresh: GitHubRefreshWorkspace
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
      /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/github(\/checks)?$/,
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
    const snapshot = await dependencies.refresh(workspace, {
      userId: context.user.id,
    })
    if (snapshot === null) throw githubFailure()
    const checks = match[2] === '/checks'
    const body = checks
      ? (snapshot.checks satisfies GitHubChecksResponse)
      : ({ banner: snapshot.banner } satisfies GitHubBannerResponse)
    return privateResponse(
      request.method === 'HEAD' ? new Response(null) : Response.json(body),
    )
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
