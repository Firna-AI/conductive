import type { Session } from '../../src/shared/generated/Session'

import type { ActiveTurnMismatch } from '../warning-active-turn'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

/**
 * The mismatch between the active turn of a session and the workspace
 * summary, or null. A session names a queued turn before its start, so a
 * queued turn counts only when it has a start time. A running or stopping
 * turn counts when the summary leaves it out, because the sidebar and the
 * idle stop then treat the workspace as idle.
 */
export function activeTurnMismatch(
  turn: StoredTurn | undefined,
  runningTurnIds: ReadonlySet<string>,
): ActiveTurnMismatch | null {
  if (!turn) return 'missing'
  switch (turn.state) {
    case 'finished':
    case 'stopped':
    case 'failed':
      return 'ended'
    case 'queued':
      return turn.startedAt === undefined ? null : 'queued_started'
    case 'running':
    case 'stopping':
      return runningTurnIds.has(turn.id) ? null : 'not_in_running_list'
  }
}

/**
 * Writes a warning for each session whose active turn does not count as
 * running. It reads committed records and changes none. A failed read
 * writes no warning and fails no request.
 */
export async function warnActiveTurnMismatches(
  view: ChatTransaction,
  workspaceId: string,
  sessions: readonly Session[],
): Promise<void> {
  try {
    const running = new Set(await view.runningTurnIds())
    for (const session of sessions) {
      if (!session.activeTurnId) continue
      const turn = await view.turn(session.activeTurnId)
      const reason = activeTurnMismatch(turn, running)
      if (reason === null) continue
      warnWorker({
        kind: 'session_active_turn_not_running',
        workspaceId: WarningId.checked(workspaceId),
        sessionId: WarningId.checked(session.id),
        turnId: WarningId.checked(session.activeTurnId),
        reason,
        turnState: turn?.state ?? 'missing',
        startedAt: turn?.startedAt ?? null,
      })
    }
  } catch {
    warnWorker({ kind: 'active_turn_check_failed' })
  }
}
