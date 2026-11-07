import type { AgentChatEvent } from '../../src/shared/chat-events'
import type { EngineOptions, SessionRuntime } from './engine-session'
import type { ProviderEvent } from './providers/types'
import { cancelable } from './engine-cancel'
import { failureCause } from './providers/failure'

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
  await turn.output.finish(
    stopped ? 'stopped' : event.type === 'failed' ? 'failed' : 'done',
  )
  let result = event
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
    } catch (error) {
      if (!turn.controller.signal.aborted) result = failureCause(error)
    }
  }
  if (turn.controller.signal.aborted && !turn.stopped) return
  stopped ||= turn.stopped
  if (result.type === 'failed' && !stopped) {
    await emit({
      type: 'turn.failed',
      ...context,
      error: { code: result.code, message: result.message },
      retryMessageId: turn.retryMessageId,
      durationMs,
    })
    session.active = null
    session.generation++
    const provider = session.provider
    session.provider = null
    await provider?.close()
  } else {
    await emit({
      type: 'turn.completed',
      ...context,
      state: stopped ? 'stopped' : 'finished',
      durationMs,
      files: turn.files ?? [],
      omittedFileCount: 0,
      userMessageIds: turn.messageIds,
    })
  }
  session.active = null
}
