import {
  operatorCodesPath,
  operatorSignupPausePath,
  operatorWaitlistPath,
  type OperatorApprovalResponse,
} from '../../src/shared/operator-waitlist'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { isOperator } from './access'
import { approvalEmailState, approveWaitingUser } from './approval-data'
import { approvalEmailContent, sendApprovalEmail } from './approval-email'
import {
  createOperatorCode,
  disableOperatorCode,
  parseOperatorCode,
  readOperatorCodes,
} from './code-data'
import { numericGitHubId } from './directory'
import { changeSignupPause, readSignupPause } from './signup-pause'
import { readOperatorWaitlist } from './waitlist-directory'

export async function operatorWaitlistRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  const waitlist = path === operatorWaitlistPath() && method === 'GET'
  const codes = path === operatorCodesPath() && ['GET', 'POST'].includes(method)
  const pause =
    path === operatorSignupPausePath() &&
    ['GET', 'POST', 'DELETE'].includes(method)
  const approval =
    method === 'POST'
      ? path.match(/^\/api\/operator\/users\/([^/]+)\/approval$/)
      : null
  const disable =
    method === 'POST'
      ? path.match(/^\/api\/operator\/invite-codes\/([^/]+)\/disable$/)
      : null
  if (!waitlist && !codes && !pause && !approval && !disable) return null
  if (!isOperator(env, context.user.githubId))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  const db = env.DB
  if (waitlist)
    return Response.json(await readOperatorWaitlist(db, url.searchParams))
  if (codes) {
    if (method === 'GET')
      return Response.json(await readOperatorCodes(db, url.searchParams))
    const { label, useLimit } = parseOperatorCode(context.body)
    return Response.json(
      await createOperatorCode(
        db,
        context.user.id,
        label,
        useLimit,
        dependencies.now(),
      ),
      { status: 201 },
    )
  }
  if (pause)
    return Response.json(
      await (method === 'GET'
        ? readSignupPause(db)
        : changeSignupPause(
            db,
            method === 'POST',
            context.user.id,
            dependencies.now(),
          )),
    )
  if (disable) {
    let code: string
    try {
      code = decodeURIComponent(disable[1])
    } catch {
      throw new HttpError(
        404,
        'invite_code_not_found',
        'This invite code was not found.',
      )
    }
    return Response.json(
      await disableOperatorCode(db, code, context.user.id, dependencies.now()),
    )
  }
  const githubId = approval ? numericGitHubId(approval[1]) : null
  if (githubId === null)
    throw new HttpError(404, 'user_not_found', 'The account is not available.')
  const { userId, changed } = await approveWaitingUser(
    db,
    githubId,
    context.user.id,
    dependencies.now(),
    approvalEmailContent(),
  )
  const emailFailed = changed
    ? await sendApprovalEmail(env, dependencies, userId)
    : false
  return Response.json({
    githubId,
    changed,
    approvalEmail: await approvalEmailState(db, userId),
    emailFailed,
  } satisfies OperatorApprovalResponse)
}
