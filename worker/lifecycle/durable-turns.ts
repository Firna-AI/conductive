import type { DurableLifecycleState, LifecycleHooks } from './durable-types'
import { reconciledLifecycle } from './durable-reconciliation'

export async function applyLifecycleTurn(
  state: DurableLifecycleState,
  change: { sessionId: string; running: boolean; occurredAt: number },
  hooks: LifecycleHooks,
  now: () => number,
): Promise<DurableLifecycleState> {
  const remote = await hooks.extendDeadline()
  if (state.state === 'stopped' || state.state === 'archived') return state
  if (remote) return reconciledLifecycle(state, remote, now())
  const sessions = new Set(state.runningSessions)
  if (change.running) sessions.add(change.sessionId)
  else sessions.delete(change.sessionId)
  return {
    ...state,
    runningSessions: [...sessions],
    state: sessions.size ? 'working' : 'ready',
    lastActivityAt: Math.max(state.lastActivityAt, change.occurredAt),
  }
}

export async function recoverLifecycleTurns(
  state: DurableLifecycleState,
  hooks: LifecycleHooks,
): Promise<DurableLifecycleState> {
  if (['stopped', 'error', 'archived'].includes(state.state)) return state
  const recovery = await hooks.recoverTurns?.(state.workspaceId)
  if (!recovery) return state
  return {
    ...state,
    runningSessions: recovery.runningSessions,
    lastActivityAt: Math.max(
      state.lastActivityAt,
      recovery.lastTurnEndedAt ?? 0,
    ),
    state:
      state.state === 'starting'
        ? 'starting'
        : recovery.runningSessions.length
          ? 'working'
          : ['input', 'unread'].includes(state.state)
            ? state.state
            : 'ready',
  }
}
