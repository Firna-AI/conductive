import {
  INVITE_CODE_ERROR_PARAMETER,
  joinPath,
} from '../../src/shared/waitlist'
import type { User } from '../../src/shared/api'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { isOperator } from '../operator/access'
import { displayAccessCode, normalizeAccessCode } from '../waitlist/codes'
import { hasAppAccess, isOpenSignup } from '../waitlist/data'
import { grantAppAccess } from '../waitlist/grant'
import { redeemInviteCode } from '../waitlist/use-code'

export async function signInAppAccess(
  env: AppEnv,
  user: User,
  inviteCode: unknown,
  now: number,
): Promise<string> {
  if (isOperator(env, user.githubId))
    await grantAppAccess(env.DB, user.id, { source: 'operator' }, now)
  if (!(await hasAppAccess(env.DB, user.id)) && (await isOpenSignup(env.DB)))
    await grantAppAccess(env.DB, user.id, { source: 'open_signup' }, now)
  let location = env.APP_ORIGIN
  if (
    typeof inviteCode === 'string' &&
    !(await hasAppAccess(env.DB, user.id))
  ) {
    try {
      await redeemInviteCode(env.DB, user.id, inviteCode, now)
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
      const path = joinPath(displayAccessCode(normalizeAccessCode(inviteCode)))
      const destination = new URL(path, env.APP_ORIGIN)
      destination.searchParams.set(INVITE_CODE_ERROR_PARAMETER, error.code)
      location = destination.href
    }
  }
  return location
}
