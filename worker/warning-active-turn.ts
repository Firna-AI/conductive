import type { WarningId } from './warning-values'

const ACTIVE_TURN_MISMATCHES = [
  'missing',
  'ended',
  'queued_started',
  'not_in_running_list',
] as const

/** Why the active turn of a session does not count as running. */
export type ActiveTurnMismatch = (typeof ACTIVE_TURN_MISMATCHES)[number]

const TURN_STATES = [
  'queued',
  'running',
  'stopping',
  'finished',
  'stopped',
  'failed',
  'missing',
] as const

export interface ActiveTurnWarning {
  kind: 'session_active_turn_not_running'
  workspaceId: WarningId
  sessionId: WarningId
  turnId: WarningId
  reason: ActiveTurnMismatch
  /** The stored state of the turn, or `missing` when no turn is stored. */
  turnState: string
  startedAt: number | null
}

export function activeTurnWarningFields(warning: ActiveTurnWarning) {
  const { startedAt } = warning
  return {
    kind: warning.kind,
    message:
      'A session names an active turn that the workspace does not count as running.',
    workspaceId: warning.workspaceId.text,
    sessionId: warning.sessionId.text,
    turnId: warning.turnId.text,
    reason:
      ACTIVE_TURN_MISMATCHES.find((reason) => reason === warning.reason) ??
      'unknown',
    turnState:
      TURN_STATES.find((state) => state === warning.turnState) ?? 'unknown',
    startedAt:
      startedAt !== null && Number.isSafeInteger(startedAt) && startedAt >= 0
        ? startedAt
        : null,
  }
}
