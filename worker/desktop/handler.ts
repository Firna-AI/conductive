import type { DesktopResponse } from '../../src/shared/desktop'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { requireRunning, toolError, toolRequest } from '../previews/access'
import { WorkspaceTools } from '../previews/provider'
import type { ToolDependencies } from '../previews/types'

export function createDesktopHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
) {
  return {
    fetch: async (request: Request): Promise<Response> => {
      try {
        const { context, target, tail } = await toolRequest(
          request,
          env,
          dependencies.now(),
          'desktop',
        )
        if (request.method !== 'GET' || tail !== null)
          throw new HttpError(404, 'not_found', 'The page is not available.')
        requireRunning(target)
        const provider = await WorkspaceTools.forWorkspace(
          env,
          target,
          dependencies.fetch,
          context.user.id,
        )
        const expiresAt = dependencies.now() + 600_000
        const url = await provider.desktop()
        return privateResponse(
          Response.json({
            url,
            expiresAt,
          } satisfies DesktopResponse),
        )
      } catch (error) {
        return toolError(error)
      }
    },
  }
}
