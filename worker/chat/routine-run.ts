import {
  firstTurnRoutineRun,
  finishRoutineRun,
} from '../routines/run-outcome-data'
import type { ChatStore } from './store'

export async function reportRoutineFirstTurn(
  db: D1Database,
  store: ChatStore,
  workspaceId: string,
  now: number,
): Promise<void> {
  const run = await firstTurnRoutineRun(db, workspaceId)
  if (!run) return
  const turn = await store.read(workspaceId, (view) => view.turn(run.turnId))
  if (turn?.state === 'finished' || turn?.state === 'failed')
    await finishRoutineRun(
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
