import type { ToolSessionManagement } from '../tools/services'
import { toolSessionSummary } from '../tools/session-summary'
import type { ChatOperation } from './operation'
import { sessionFor } from './session-record'
import { closeSession } from './sessions'
import { renameSession, stopManagedSession } from './session-management'

export function manageToolSession(
  operation: ChatOperation,
  input: ToolSessionManagement,
  origin: string,
  randomId: () => string,
) {
  return operation.change(async (transaction) => {
    const session = await sessionFor(transaction, input.sessionId)
    const requester = {
      requestedBySession: {
        workspaceId: input.callerWorkspaceId,
        sessionId: input.callerSessionId,
      },
    }
    const stopped =
      input.kind === 'stop'
        ? await stopManagedSession(transaction, session, randomId(), requester)
        : null
    if (input.kind === 'rename')
      await renameSession(transaction, session, input.title)
    if (input.kind === 'close')
      await closeSession(
        transaction,
        session,
        input.stopRunningTurn,
        randomId(),
        requester,
      )
    return {
      session: await toolSessionSummary(
        transaction,
        session,
        input.orgId,
        origin,
      ),
      ...(stopped !== null && stopped),
    }
  })
}
