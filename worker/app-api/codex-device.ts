import { ACCOUNT_PATHS } from '../../src/shared/account'
import { pollCodexDevice, startCodexDevice } from '../codex-auth/device'
import type { CodexTaskOwner } from '../codex-auth/tasks'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'

export async function codexDeviceRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  tasks: CodexTaskOwner,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (request.method !== 'POST') return null
  if (path === ACCOUNT_PATHS.codexDevice)
    return Response.json(
      await startCodexDevice(env, context.user.id, dependencies),
    )
  const prefix = `${ACCOUNT_PATHS.codexDevice}/`
  if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/'))
    return null
  let handle: string
  try {
    handle = decodeURIComponent(path.slice(prefix.length))
  } catch {
    throw new HttpError(
      404,
      'codex_device_not_found',
      'The ChatGPT sign-in is not available.',
    )
  }
  return Response.json(
    await pollCodexDevice(env, context.user.id, handle, dependencies, tasks),
  )
}
