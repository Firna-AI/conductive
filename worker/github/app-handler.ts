import {
  type GitHubBannerResponse,
  type GitHubChecksResponse,
  type GitHubStoredResponse,
} from '../../src/shared/github'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate } from '../security/gate'
import { queueBarState, queueLeaveBase } from '../merge-queue/read'
import { queueOfPulls } from '../merge-queue/data'
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
function storedBody(
  workspace: GitHubWorkspace,
  stored: GitHubSnapshot | undefined,
  queued: boolean,
  labels: Awaited<ReturnType<typeof githubBranchLabels>>,
): GitHubStoredResponse {
  if (!stored || stored.banner.branch !== workspace.branch)
    return { state: null }
  return {
    state: {
      banner: labels.banner(bannerForQueue(stored, queued)),
      checks: stored.checks,
    },
  }
}

function bannerForQueue(snapshot: GitHubSnapshot, queued: boolean) {
  return queued && snapshot.pullBaseBranch
    ? { ...snapshot.banner, baseBranch: snapshot.pullBaseBranch }
    : snapshot.banner
}

async function readBody(
  env: AppEnv,
  workspace: GitHubWorkspace,
  route: string | undefined,
  userId: string,
  dependencies: GitHubAppDependencies,
) {
  if (route === '/stored') {
    const [stored, labels] = await Promise.all([
      dependencies.stored(workspace),
      githubBranchLabels(env, workspace),
    ])
    const queueBar = await readQueueBar(env, workspace, stored, labels)
    return {
      ...storedBody(workspace, stored, !!queueBar.queue, labels),
      ...queueBar,
    }
  }
  const snapshot = await dependencies.refresh(workspace, { userId })
  if (snapshot === null) throw githubFailure()
  if (route === '/checks') return snapshot.checks satisfies GitHubChecksResponse
  const labels = await githubBranchLabels(env, workspace)
  const queueBar = await readQueueBar(env, workspace, snapshot, labels)
  return {
    banner: labels.banner(bannerForQueue(snapshot, !!queueBar.queue)),
    ...queueBar,
  } satisfies GitHubBannerResponse
}

async function readQueueBar(
  env: AppEnv,
  workspace: GitHubWorkspace,
  snapshot: GitHubSnapshot | undefined,
  labels: Awaited<ReturnType<typeof githubBranchLabels>>,
): Promise<Pick<GitHubBannerResponse, 'queue' | 'queueLeave' | 'mergeStack'>> {
  const current =
    snapshot?.banner.branch === workspace.branch ? snapshot : undefined
  const below = current?.stackBelow
  const [queue, stackQueue] = await Promise.all([
    queueBarState(env.DB, workspace, current),
    below?.length
      ? queueOfPulls(
          env.DB,
          {
            orgId: workspace.orgId,
            githubRepositoryId: workspace.repositoryId,
          },
          below,
        )
      : null,
  ])
  const stack = below?.length
    ? { mergeStack: { count: below.length + 1, queue: stackQueue } }
    : {}
  if (queue)
    return {
      ...stack,
      queue: {
        ...queue,
        trunkLabel: labels.branch(queue.trunk),
        rebase: { ...queue.rebase, label: labels.branch(queue.rebase.base) },
      },
    }
  const base = await queueLeaveBase(env.DB, workspace, current)
  if (!base || !current) return stack
  return { ...stack, queueLeave: { baseBranch: labels.branch(base).text } }
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
