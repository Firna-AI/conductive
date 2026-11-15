import { cancelable } from './engine-cancel'
import { disposeProvider } from './engine-disposal'
import {
  rememberSession,
  type EngineOptions,
  type SessionRuntime,
} from './engine-session'
import type { ProviderEvent, ProviderInput } from './providers/types'

interface EventActions {
  start: (command: ProviderInput) => Promise<void>
  deliver: (command: ProviderInput) => Promise<'sent' | 'deferred' | 'failed'>
  finish: (
    event: Extract<ProviderEvent, { type: 'result' | 'failed' }>,
  ) => Promise<void>
}

export async function providerEvent(
  options: EngineOptions,
  session: SessionRuntime,
  event: ProviderEvent,
  actions: EventActions,
  acceptedBeforeStop = false,
): Promise<void> {
  if (event.type === 'conversation') {
    if (session.conversationId !== event.id) {
      session.conversationId = event.id
      await rememberSession(options.store, session)
    }
    return
  }
  const turn = session.active
  if (!turn || (turn.stopped && !acceptedBeforeStop)) return
  if (event.type === 'speed') {
    if (
      !turn.speed ||
      (event.speed.state === 'standard' &&
        (turn.speed.state === 'fast' || !turn.speed.cause))
    )
      turn.speed = event.speed
    return
  }
  if (event.type === 'background' || event.type === 'activity') {
    const done =
      event.type === 'background'
        ? turn.background?.work(event.live, event.idle)
        : turn.background?.activity(event.idle)
    if (done && turn.messageIds.every((id) => turn.resolvedMessageIds.has(id)))
      await continueResult(
        session,
        { type: 'wake-up', state: 'finished' },
        actions,
      )
    return
  }
  await turn.output.accept(event)
  if (turn.stopped) return
  const signal = turn.controller.signal
  if (
    event.type === 'tool' &&
    event.tool.state === 'running' &&
    turn.waiting.length &&
    turn.provider
  ) {
    const provider = turn.provider
    await cancelable(signal, () => provider.interrupt())
  }
  if (event.type === 'failed') {
    await actions.finish(event)
    return
  }
  if (event.type === 'result' || event.type === 'wake-up')
    await continueResult(session, event, actions)
}

async function continueResult(
  session: SessionRuntime,
  event: Extract<ProviderEvent, { type: 'result' | 'wake-up' }>,
  actions: EventActions,
): Promise<void> {
  const turn = session.active
  if (!turn) return
  const signal = turn.controller.signal
  const answered =
    event.type === 'wake-up'
      ? []
      : event.userMessageIds.length
        ? event.userMessageIds
        : turn.messageIds
  for (const id of answered) turn.resolvedMessageIds.add(id)
  if (turn.messageIds.some((id) => !turn.resolvedMessageIds.has(id))) return
  const next = turn.waiting.shift()
  if (!next) {
    const result =
      event.type === 'wake-up'
        ? { type: 'result' as const, state: event.state, userMessageIds: [] }
        : event
    const disposition =
      event.state === 'finished' ? turn.background?.reply() : 'finish'
    if (disposition === 'wait') return
    await actions.finish(
      disposition === 'limit'
        ? { ...result, endReason: 'background_work_limit' }
        : result,
    )
    return
  }
  await turn.output.finish('stopped')
  turn.background?.restart()
  session.generation++
  const closing = disposeProvider(turn)
  await cancelable(signal, () => closing)
  turn.messageIds.push(next.message.id)
  turn.retryMessageId = next.message.id
  await actions.start(next)
  while (turn.waiting.length) {
    const message = turn.waiting.shift()
    if (!message) continue
    const control = await actions.deliver(message)
    if (control === 'deferred') turn.waiting.unshift(message)
    if (control !== 'sent') break
  }
}
