import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { errorResponse, HttpError, privateResponse } from '../http'
import { BodyBudgetExceeded, readBoundedBody } from '../http/bounded-body'
import type { GitHubRefreshWorkspace } from './contracts'
import {
  completeDelivery,
  isProcessed,
  recordDelivery,
  repositoryWorkspaces,
} from './data'
import { webhookRoute, type GitHubPullRequestEvent } from './webhook-routing'

export const GITHUB_WEBHOOK_BODY_BYTES = 26 * 1024 * 1024

export interface GitHubWebhookEnv {
  DB: D1Database
  MACHINE_ORIGIN: string
  GITHUB_WEBHOOK_SECRET: string
}

export interface GitHubWebhookDependencies {
  now: () => number
  refresh: GitHubRefreshWorkspace
  pullRequest?: (
    event: GitHubPullRequestEvent,
    deliveryId: string,
  ) => Promise<void>
  pushed?: (
    repositoryId: number,
    installationId: number,
    branch: string,
  ) => Promise<void>
}

async function authenticatedBody(
  request: Request,
  secret: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const signature = request.headers.get('X-Hub-Signature-256')
  if (!secret)
    throw new HttpError(
      503,
      'github_unavailable',
      'GitHub is not available. Try again.',
    )
  if (!signature || !/^sha256=[\da-f]{64}$/i.test(signature))
    throw new HttpError(
      403,
      'github_signature_invalid',
      'The GitHub signature is not valid.',
    )
  let body: Uint8Array<ArrayBuffer>
  try {
    body =
      request.body === null
        ? new Uint8Array(0)
        : await readBoundedBody(request.body, GITHUB_WEBHOOK_BODY_BYTES)
  } catch (error) {
    if (error instanceof BodyBudgetExceeded)
      throw new HttpError(
        413,
        'github_webhook_too_large',
        'The GitHub webhook is too large.',
      )
    throw error
  }
  const bytes = Uint8Array.from(signature.slice(7).match(/../g) ?? [], (hex) =>
    Number.parseInt(hex, 16),
  )
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify('HMAC', key, bytes, body)
  if (!valid)
    throw new HttpError(
      403,
      'github_signature_invalid',
      'The GitHub signature is not valid.',
    )
  return body
}

/** Machine endpoint. Verify the raw bytes before JSON parsing or D1 access. */
export async function handleGitHubWebhook(
  request: Request,
  env: GitHubWebhookEnv,
  dependencies: GitHubWebhookDependencies,
): Promise<Response> {
  try {
    const url = new URL(request.url)
    if (
      url.origin !== env.MACHINE_ORIGIN ||
      url.pathname !== MACHINE_PATHS.githubWebhook ||
      request.method !== 'POST' ||
      request.headers.has('Upgrade')
    ) {
      throw new HttpError(404, 'not_found', 'The page is not available.')
    }
    const body = await authenticatedBody(request, env.GITHUB_WEBHOOK_SECRET)
    let value: unknown
    try {
      value = JSON.parse(new TextDecoder().decode(body))
    } catch {
      throw new HttpError(400, 'invalid_json', 'The request is not valid JSON.')
    }
    const event = request.headers.get('X-GitHub-Event')
    const deliveryId = request.headers.get('X-GitHub-Delivery')
    if (!event || !deliveryId) {
      throw new HttpError(
        400,
        'github_webhook_invalid',
        'The GitHub webhook is not valid.',
      )
    }
    const route = webhookRoute(event, value)
    if (route === null || (await isProcessed(env.DB, deliveryId)))
      return new Response(null, { status: 204 })
    await recordDelivery(env.DB, deliveryId, dependencies.now())
    let pullRequestFailure: { error: unknown } | undefined
    try {
      if (route.pullRequest)
        await dependencies.pullRequest?.(route.pullRequest, deliveryId)
    } catch (error) {
      pullRequestFailure = { error }
    }
    const workspaces = await repositoryWorkspaces(
      env.DB,
      route.repositoryId,
      route.installationId,
    )
    for (const workspace of workspaces) {
      const matches =
        route.push ||
        route.branch === undefined ||
        route.branch === workspace.branch
      if (!matches) continue
      await dependencies.refresh(workspace, {
        deliveryId,
        ...(route.push ? { pushBranch: route.branch } : {}),
      })
    }
    if (route.push && route.branch !== undefined)
      await dependencies.pushed?.(
        route.repositoryId,
        route.installationId,
        route.branch,
      )
    if (pullRequestFailure) throw pullRequestFailure.error
    await completeDelivery(env.DB, deliveryId, dependencies.now())
    return new Response(null, { status: 204 })
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}
