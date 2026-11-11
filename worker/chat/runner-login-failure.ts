import { unavailableLoginMessage } from './session-login'
import type { ChatStore } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { ChatDependencies, PendingCommand } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

/**
 * Fails the turn of a command whose login cannot run, with `reason` or the
 * cause of the missing login. The default completion waits for the runner
 * and fails only a queued turn. `immediate` also ends a running turn at
 * once, as a runner that cannot run the login kind needs.
 */
export async function failCommandLogin(
  store: ChatStore,
  dependencies: Pick<ChatDependencies, 'randomId'>,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  workspaceId: string,
  command: Extract<PendingCommand, { messageId: string }>,
  reason?: string,
  completion: 'after-runner' | 'immediate' = 'after-runner',
): Promise<void> {
  await store.change(
    workspaceId,
    async (transaction) => {
      const turn = await transaction.turn(command.turnId)
      if (!turn || (completion !== 'immediate' && turn.state !== 'queued'))
        return
      const session = await transaction.session(turn.sessionId)
      if (!session || session.activeTurnId !== turn.id) return
      await new TurnLifecycle(transaction, session).fail(
        turn.id,
        reason ?? unavailableLoginMessage(session),
        dependencies.randomId,
        completion,
      )
    },
    publish,
  )
}
