import type { ChatStore } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import type { ChatDependencies } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

export const unsupportedRunnerReason =
  'This cloud computer can no longer run agents. Ask an admin to build the org image again. Then start a new workspace.'

export async function failUnsupportedRunner(
  store: ChatStore,
  dependencies: ChatDependencies,
  publish: (events: readonly WorkspaceEventEnvelope[]) => void,
  workspaceId: string,
): Promise<void> {
  await store.change(
    workspaceId,
    async (transaction) => {
      for (const session of await transaction.sessions()) {
        const lifecycle = new TurnLifecycle(transaction, session)
        let turn = session.activeTurnId
          ? await transaction.turn(session.activeTurnId)
          : undefined
        while (turn && ['queued', 'running', 'stopping'].includes(turn.state)) {
          await lifecycle.runnerEnded(
            turn,
            {
              type: 'turn.failed',
              sessionId: session.id,
              turnId: turn.id,
              error: {
                code: 'runner_protocol_unsupported',
                message: unsupportedRunnerReason,
              },
              retryMessageId: turn.messageIds[0] ?? '',
              durationMs: Math.max(
                0,
                transaction.now - (turn.startedAt ?? transaction.now),
              ),
            },
            transaction.now,
            dependencies.randomId,
          )
          turn = session.activeTurnId
            ? await transaction.turn(session.activeTurnId)
            : undefined
        }
      }
    },
    publish,
  )
  await dependencies.runnerUnsupported(workspaceId, async (event, at) => {
    await store.change(
      workspaceId,
      (transaction) => transaction.emit(event, at),
      publish,
    )
  })
}
