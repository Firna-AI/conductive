import type { AgentWatchSessionResponse } from '../../src/shared/generated/AgentWatchSessionResponse'
import { sessionLink } from '../../src/shared/session-link'
import { hash } from '../security/crypto'
import { HttpError } from '../http'
import type { ToolSessionAccess } from '../tools/services'
import type { ToolSessionWatch } from './session-watch-records'
import type { ChatOperation } from './operation'
import type { ChatDependencies } from './types'
import { sessionFor } from './session-record'
import { watchEnd } from './session-watch-end'

/** Registration and turn completion hold the same target queue. */
export async function registerSessionWatch(
  operation: ChatOperation,
  input: ToolSessionWatch,
  access: ToolSessionAccess,
  origin: string,
  alarm: ChatDependencies['sessionWatchAlarm'],
  now: number,
): Promise<AgentWatchSessionResponse> {
  const session = await operation.read((view) =>
    sessionFor(view, input.sessionId),
  )
  const turnId = input.turnId ?? session.activeTurnId
  const reply = {
    workspace: access.workspace,
    session: {
      id: session.id,
      link: sessionLink(origin, input.orgId, input.workspaceId, session.id),
    },
  }
  if (!turnId) return { ...reply, state: 'idle' }
  const turn = await operation.read((view) => view.turn(turnId))
  if (!turn || turn.sessionId !== session.id)
    throw new HttpError(404, 'turn_not_found', 'The turn is not available.')
  if (
    input.workspaceId === input.caller.workspaceId &&
    turn.id === input.caller.turnId
  )
    throw new HttpError(400, 'invalid_input', 'Watch a different turn.')
  const state = watchEnd(turn.state)
  if (state)
    return input.turnId === undefined
      ? { ...reply, state: 'idle' }
      : { ...reply, state, turnId }
  const id = await hash(
    JSON.stringify([
      input.orgId,
      input.caller.workspaceId,
      input.caller.sessionId,
      input.caller.senderUserId,
      input.workspaceId,
      session.id,
      turnId,
      input.caller.stopNonce,
    ]),
  )
  // Durable recovery precedes the first watch acknowledgement.
  await alarm?.(now + 30_000, true)
  await operation.change(async (view) => {
    await view.watches.assertActive()
    if (!(await view.watches.target(id)))
      await view.watches.saveTarget({ ...input, turnId, id, stage: 'pending' })
  })
  return { ...reply, state: 'watching', turnId, watchId: id }
}
