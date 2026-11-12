import type { createWorkspaceIntegration } from './workspace-integration'
import type { QueueTurn } from './queue-turn'

export function runWorkspaceLifecycle<T>(
  integration: Pick<
    ReturnType<typeof createWorkspaceIntegration>,
    'chat' | 'withGeneration'
  >,
  operation: (turn: QueueTurn) => Promise<T>,
): Promise<T> {
  const { chat, withGeneration } = integration
  return chat.runLifecycle((turn) =>
    withGeneration(turn, async () => {
      const result = await operation(turn)
      await chat.flushRunner()
      return result
    }),
  )
}
