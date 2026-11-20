import {
  IDLE_STOP_CHOICE_ERROR,
  isIdleStopMinutes,
  operatorIdleStopPath,
  type IdleStopMinutes,
  type OperatorIdleStopResponse,
} from '../../src/shared/operator-idle-stop'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { isOperator } from './access'
import { changeIdleStopSetting, readIdleStopSetting } from './idle-stop-data'

async function readOperatorIdleStop(
  db: D1Database,
): Promise<OperatorIdleStopResponse> {
  const setting = await readIdleStopSetting(db)
  return {
    minutes: setting.minutes,
    updatedAt: setting.updatedAt,
    operator:
      setting.githubId === null || setting.login === null
        ? null
        : { githubId: setting.githubId, login: setting.login },
  }
}

function parseMinutes(body: Record<string, unknown> | null): IdleStopMinutes {
  const minutes = body?.minutes
  if (!isIdleStopMinutes(minutes))
    throw new HttpError(400, 'invalid_input', IDLE_STOP_CHOICE_ERROR)
  return minutes
}

/**
 * Saves the stop time. An equal time changes nothing and records no event.
 * A change writes the event and the setting in one conditional batch, and
 * reads again after a concurrent write.
 */
async function updateOperatorIdleStop(
  db: D1Database,
  body: Record<string, unknown> | null,
  operatorId: string,
  now: () => number,
): Promise<OperatorIdleStopResponse> {
  const minutes = parseMinutes(body)
  for (;;) {
    const before = await readIdleStopSetting(db)
    if (before.minutes === minutes) return readOperatorIdleStop(db)
    if (
      await changeIdleStopSetting(
        db,
        before.minutes,
        minutes,
        operatorId,
        now(),
      )
    )
      return readOperatorIdleStop(db)
  }
}

export async function operatorIdleStopRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (
    new URL(request.url).pathname !== operatorIdleStopPath() ||
    !['GET', 'PUT'].includes(request.method)
  )
    return null
  if (!isOperator(env, context.user.githubId))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  return Response.json(
    await (request.method === 'GET'
      ? readOperatorIdleStop(env.DB)
      : updateOperatorIdleStop(
          env.DB,
          context.body,
          context.user.id,
          dependencies.now,
        )),
  )
}
