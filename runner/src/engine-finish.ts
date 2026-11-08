import type { AgentChatEvent } from '../../src/shared/chat-events'
import type { EngineOptions, SessionRuntime } from './engine-session'
import type { ProviderEvent } from './providers/types'
import { cancelable } from './engine-cancel'
import { disposeProvider } from './engine-disposal'

export async function finishTurn(
  options: EngineOptions,
  session: SessionRuntime,
  event: Extract<ProviderEvent, { type: 'result' | 'failed' }>,
  emit: (event: AgentChatEvent) => Promise<void>,
): Promise<void> {
  const turn = session.active
  if (!turn) return
  const context = { sessionId: session.id, turnId: turn.first.turnId }
  const durationMs = Math.max(0, options.now() - turn.startedAt)
  let stopped =
    turn.stopped || (event.type === 'result' && event.state === 'stopped')
  try {
    await turn.output.finish(
      stopped ? 'stopped' : event.type === 'failed' ? 'failed' : 'done',
    )
  } catch {
    options.warn('The final agent output could not be saved.')
  }
  session.generation++
  const closing = disposeProvider(turn)
  let closeFailure: { error: unknown } | null = null
  try {
    await closing
  } catch (error) {
    closeFailure = { error }
  }
  const result = event
  if (
    !turn.controller.signal.aborted &&
    result.type === 'result' &&
    turn.baseline !== null
  ) {
    const baseline = turn.baseline
    try {
      turn.files = await cancelable(turn.controller.signal, () =>
        options.changedSince(baseline, turn.controller.signal),
      )
    } catch {
      if (!turn.controller.signal.aborted)
        options.warn('The changed files could not be read.')
    }
  }
  if (turn.shutdown && turn.baseline !== null && turn.files === null) {
    try {
      turn.files = await options.changedSince(
        turn.baseline,
        new AbortController().signal,
      )
    } catch {
      options.warn('The changed files could not be read.')
    }
  }
  if (turn.controller.signal.aborted && !turn.stopped) return
  stopped ||= turn.stopped
  try {
    if (result.type === 'failed' && !stopped) {
      await emit({
        type: 'turn.failed',
        ...context,
        error: { code: result.code, message: result.message },
        retryMessageId: turn.retryMessageId,
        durationMs,
      })
    } else {
      await emit({
        type: 'turn.completed',
        ...context,
        state: stopped ? 'stopped' : 'finished',
        durationMs,
        files: turn.files ?? [],
        ...(turn.baseline !== null && turn.files === null
          ? { filesUnavailable: true }
          : {}),
        omittedFileCount: 0,
        userMessageIds: turn.messageIds,
      })
    }
  } finally {
    session.active = null
  }
  if (closeFailure) throw closeFailure.error
}
