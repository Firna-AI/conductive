import type { AgentChatEvent } from '../../src/shared/chat-events'
import type { EngineOptions, SessionRuntime } from './engine-session'
import type { ProviderEvent } from './providers/types'

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
  const stopped =
    turn.stopped || (event.type === 'result' && event.state === 'stopped')
  await turn.output.finish(
    stopped ? 'stopped' : event.type === 'failed' ? 'failed' : 'done',
  )
  if (event.type === 'failed' && !stopped) {
    await emit({
      type: 'turn.failed',
      ...context,
      error: { code: event.code, message: event.message },
      retryMessageId: turn.first.message.id,
      durationMs,
    })
    session.generation++
    await session.provider?.close()
    session.provider = null
  } else {
    await emit({
      type: 'turn.completed',
      ...context,
      state: stopped ? 'stopped' : 'finished',
      durationMs,
      files: await options.changedSince(turn.baseline),
      omittedFileCount: 0,
      userMessageIds: turn.messageIds,
    })
  }
  session.active = null
}
