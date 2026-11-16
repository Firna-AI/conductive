import {
  firstTurnAutomationRun,
  finishAutomationRun,
} from '../automations/run-outcome-data'
import type { ChatStore } from './store'

export async function reportAutomationFirstTurn(
  db: D1Database,
  store: ChatStore,
  workspaceId: string,
  now: number,
): Promise<void> {
  const run = await firstTurnAutomationRun(db, workspaceId)
  if (!run) return
  const turn = await store.read(workspaceId, (view) => view.turn(run.turnId))
  if (turn?.state === 'finished' || turn?.state === 'failed')
    await finishAutomationRun(
      db,
      run.orgId,
      run.id,
      turn.state === 'finished'
        ? { state: 'finished' }
        : {
            state: 'failed',
            error: turn.error ?? {
              code: 'agent_turn_failed',
              message:
                'The agent could not finish. Try again in the workspace.',
            },
          },
      now,
      workspaceId,
    )
}
