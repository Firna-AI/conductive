import {
  WAITLIST_PATHS,
  type UseInviteCodeRequest,
  type UseInviteCodeResponse,
  type WaitlistStateResponse,
} from '../../src/shared/waitlist'
import type { AppDependencies, AppEnv } from '../env'
import type { RequestContext } from '../security/gate'
import { readWaitlistState } from './data'
import { redeemInviteCode } from './use-code'

export async function waitlistRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (path === WAITLIST_PATHS.state && request.method === 'GET')
    return Response.json(
      (await readWaitlistState(
        env.DB,
        context.user.id,
      )) satisfies WaitlistStateResponse,
    )
  if (path !== WAITLIST_PATHS.useCode || request.method !== 'POST') return null
  const body: UseInviteCodeRequest = {
    code: typeof context.body?.code === 'string' ? context.body.code : '',
  }
  await redeemInviteCode(env.DB, context.user.id, body.code, dependencies.now())
  return Response.json(
    (await readWaitlistState(
      env.DB,
      context.user.id,
    )) satisfies UseInviteCodeResponse,
  )
}
