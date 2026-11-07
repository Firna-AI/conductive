import { cancelable } from './engine-cancel'
import {
  rememberSession,
  senderIdentity,
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
  await turn.output.accept(event)
  if (turn.stopped) return
  const signal = turn.controller.signal
  if (
    event.type === 'tool' &&
    event.tool.state === 'running' &&
    turn.waiting.length &&
    session.provider
  ) {
    const provider = session.provider
    await cancelable(signal, () => provider.interrupt())
  }
  if (event.type !== 'result' && event.type !== 'failed') return
  if (event.type === 'result') {
    const answered = event.userMessageIds.length
      ? event.userMessageIds
      : turn.messageIds
    for (const id of answered) turn.resolvedMessageIds.add(id)
    if (turn.messageIds.some((id) => !turn.resolvedMessageIds.has(id))) return
  } else if (turn.waiting.length) {
    for (const id of turn.messageIds) turn.resolvedMessageIds.add(id)
  }
  const next = turn.waiting.shift()
  if (!next) {
    await actions.finish(event)
    return
  }
  await turn.output.finish('stopped')
  session.generation++
  const provider = session.provider
  session.provider = null
  if (provider) await cancelable(signal, () => provider.close())
  turn.messageIds.push(next.message.id)
  await actions.start(next)
  while (
    turn.waiting.length &&
    senderIdentity(turn.waiting[0]) === session.identity
  ) {
    const message = turn.waiting.shift()
    if (!message) continue
    const control = await actions.deliver(message)
    if (control === 'deferred') turn.waiting.unshift(message)
    if (control !== 'sent') break
  }
}
