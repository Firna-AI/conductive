import { MACHINE_PATHS } from '../../../src/shared/agent-tools.ts'
import { GITHUB_SETUP_PATH } from '../../../src/shared/github-setup.ts'
import { authenticatedBody } from '../../../worker/github/webhook.ts'
import { errorResponse, privateResponse } from '../../../worker/http.ts'
import type { RelayContext, RelayDependencies, RelayEnv } from './env.ts'
import { fanOut } from './fan-out.ts'
import { installReturn } from './install-return.ts'
import { listPage } from './pages.ts'
import { warnRelay } from './warnings.ts'

const DEFAULT_DEPENDENCIES: RelayDependencies = {
  fetch: (request) => fetch(request),
  warn: warnRelay,
}

export async function relayFetch(
  request: Request,
  env: RelayEnv,
  ctx: RelayContext,
  dependencies: RelayDependencies = DEFAULT_DEPENDENCIES,
): Promise<Response> {
  try {
    const path = new URL(request.url).pathname
    if (path === MACHINE_PATHS.githubWebhook && request.method === 'POST') {
      const body = await authenticatedBody(request, env.GITHUB_WEBHOOK_SECRET)
      ctx.waitUntil(fanOut(request, body, env, dependencies))
      return privateResponse(new Response(null, { status: 202 }))
    }
    if (path === GITHUB_SETUP_PATH && request.method === 'GET')
      return privateResponse(await installReturn(request, env))
    if (path === '/' && (request.method === 'GET' || request.method === 'HEAD'))
      return privateResponse(await listPage(request, env))
    return privateResponse(new Response(null, { status: 404 }))
  } catch (error) {
    return privateResponse(errorResponse(error))
  }
}

export default { fetch: relayFetch } satisfies ExportedHandler<RelayEnv>
