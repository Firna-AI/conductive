import type { SessionWakeUpsResponse } from '../../src/shared/generated/SessionWakeUpsResponse'
import type { RequestContext } from '../security/gate'
import { invalidInput } from './inputs'
import type { ChatOperation } from './operation'
import { cancelWakeUp } from './session-wake-up-cancel'
import { sessionFor } from './session-record'

function decode(id: string): string {
  try {
    return decodeURIComponent(id)
  } catch {
    return invalidInput()
  }
}

export async function sessionWakeUpRoute(
  method: string,
  suffix: string,
  context: RequestContext,
  operation: ChatOperation,
): Promise<Response | null> {
  const match = suffix.match(
    /^\/sessions\/([^/]+)\/wake-ups(?:\/([^/]+)\/cancel)?$/,
  )
  if (!match) return null
  const sessionId = decode(match[1])
  if (method === 'GET' && match[2] === undefined)
    return operation.read(async (view) => {
      await sessionFor(view, sessionId)
      return Response.json({
        eventNumber: view.eventNumber,
        wakeUps: await view.wakeUps.pending(sessionId),
      } satisfies SessionWakeUpsResponse)
    })
  if (method === 'POST' && match[2] !== undefined)
    return Response.json(
      await cancelWakeUp(operation, sessionId, decode(match[2]), {
        kind: 'member',
        memberId: context.user.id,
      }),
    )
  return null
}
