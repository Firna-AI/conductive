import {
  DEFAULT_IDLE_STOP_MINUTES,
  IDLE_STOP_CHOICE_ERROR,
  isIdleStopMinutes,
  operatorIdleStopPath,
  type OperatorIdleStopResponse,
} from '../../shared/operator-idle-stop'
import type { DevBackend } from './backend'
import { json, RouteError, type Route } from './router'

/**
 * The Settings tab of the dev fake: the stop time of idle cloud computers.
 * A save that changes the time records the operator and the time, and a
 * save of the same time keeps the record, as the Worker does. The time
 * lives as long as the fake.
 */
export function idleStopRoutes(
  backend: DevBackend,
  guard: () => void,
  operator: () => { githubId: number; login: string },
): Route[] {
  let saved: OperatorIdleStopResponse = {
    minutes: DEFAULT_IDLE_STOP_MINUTES,
    updatedAt: null,
    operator: null,
  }
  return [
    {
      method: 'GET',
      path: operatorIdleStopPath(),
      answer: () => {
        guard()
        return json(saved)
      },
    },
    {
      method: 'PUT',
      path: operatorIdleStopPath(),
      answer: ({ body }) => {
        guard()
        const minutes =
          typeof body === 'object' && body !== null && 'minutes' in body
            ? body.minutes
            : undefined
        if (!isIdleStopMinutes(minutes))
          throw new RouteError(400, 'invalid_input', IDLE_STOP_CHOICE_ERROR)
        if (minutes !== saved.minutes)
          saved = { minutes, updatedAt: backend.now(), operator: operator() }
        return json(saved)
      },
    },
  ]
}
