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

/**
 * The result of the app access step of a sign-in, and the address that it
 * opens. `ready` has app access and opens the app root. `waiting` has no
 * app access and opens the app root, which shows the waitlist.
 * `invite_error` opens the join page with the error of its code.
 */
export type SignInOutcome =
  | { kind: 'ready' | 'waiting'; location: string }
  | { kind: 'invite_error'; location: string }

export async function signInAppAccess(
  env: AppEnv,
  user: User,
  inviteCode: unknown,
  now: number,
): Promise<SignInOutcome> {
  if (isOperator(env, user.githubId))
    await grantAppAccess(env.DB, user.id, { source: 'operator' }, now)
  if (!(await hasAppAccess(env.DB, user.id)) && (await isOpenSignup(env.DB)))
    await grantAppAccess(env.DB, user.id, { source: 'open_signup' }, now)
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
      return { kind: 'invite_error', location: destination.href }
    }
  }
  const ready = await hasAppAccess(env.DB, user.id)
  return { kind: ready ? 'ready' : 'waiting', location: env.APP_ORIGIN }
}
