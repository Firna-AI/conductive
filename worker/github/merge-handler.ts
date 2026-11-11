import type { AppDependencies, AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import type { GitHubRefreshWorkspace, GitHubWorkspace } from './contracts'
import { readMergeWorkspace } from './merge-access'
import { GitHubMerge } from './merge'

export interface MergeStorage {
  get(key: string): Promise<unknown>
  put(key: string, value: unknown): Promise<void>
}

export interface GitHubMergeDependencies extends AppDependencies {
  storage: MergeStorage
  refresh: GitHubRefreshWorkspace
  /** Stores a fresh read for the workspace alarm, which retries a failed read. */
  scheduleRefresh: (workspace: GitHubWorkspace) => Promise<void>
}

export async function handleGitHubMerge(
  request: Request,
  env: AppEnv,
  dependencies: GitHubMergeDependencies,
): Promise<Response> {
  try {
    const context = await gate(request, env, dependencies.now())
    const path = new URL(request.url).pathname
    const match = path.match(
      /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/github\/(capabilities|merge)(?:\/([^/]+))?$/,
    )
    if (!match || !context.org || request.headers.has('Upgrade'))
      throw new HttpError(404, 'not_found', 'The page is not available.')
    let workspaceId: string
    let mergeId: string | null
    try {
      workspaceId = decodeURIComponent(match[1])
      mergeId = match[3] === undefined ? null : decodeURIComponent(match[3])
    } catch {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    const capability =
      match[2] === 'capabilities' &&
      mergeId === null &&
      ['GET', 'HEAD'].includes(request.method)
    const start =
      match[2] === 'merge' && mergeId === null && request.method === 'POST'
    const poll =
      match[2] === 'merge' &&
      mergeId !== null &&
      ['GET', 'HEAD'].includes(request.method)
    if (!capability && !start && !poll)
      throw new HttpError(404, 'not_found', 'The page is not available.')
    const workspace = await readMergeWorkspace(
      env.DB,
      context.org.id,
      workspaceId,
      context.user.id,
    )
    const merge = new GitHubMerge(env, dependencies)
    if (capability) {
      const body = await merge.capabilities(workspace, context.user.id)
      return privateResponse(
        request.method === 'HEAD' ? new Response(null) : Response.json(body),
      )
    }
    if (poll && mergeId !== null) {
      const body = await merge.poll(workspace, context.user.id, mergeId)
      return privateResponse(
        request.method === 'HEAD' ? new Response(null) : Response.json(body),
      )
    }
    const body = context.body
    if (
      !body ||
      typeof body.headSha !== 'string' ||
      !body.headSha ||
      (body.method !== 'merge' &&
        body.method !== 'squash' &&
        body.method !== 'rebase')
    )
      throw new HttpError(
        400,
        'invalid_input',
        'Review the pull request, then merge again.',
      )
    const result = await merge.start(workspace, context.user.id, {
      headSha: body.headSha,
      method: body.method,
    })
    return privateResponse(
      Response.json(result, { status: result.state === 'pending' ? 202 : 200 }),
    )
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
