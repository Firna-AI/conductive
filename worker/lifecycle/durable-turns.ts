import type { DurableLifecycleState, LifecycleHooks } from './durable-types'

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
