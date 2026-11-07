import type { AgentChatEvent } from '../../src/shared/chat-events'
import { cancelable } from './engine-cancel'
import {
  rememberSession,
  senderIdentity,
  type EngineOptions,
  type SessionRuntime,
  type ActiveTurn,
} from './engine-session'
import type { ProviderInput } from './providers/types'
import { TurnOutput } from './turn-output'

export interface InputActions {
  created: (session: SessionRuntime) => void
  controller: AbortController
  emit: (event: AgentChatEvent) => Promise<void>
  enqueue: (action: () => Promise<void>) => void
  start: (command: ProviderInput) => Promise<void>
  deliver: (command: ProviderInput) => Promise<'sent' | 'deferred' | 'failed'>
}

export async function inputCommand(
  options: EngineOptions,
  session: SessionRuntime | null,
  command: ProviderInput,
  actions: InputActions,
): Promise<void> {
  if (
    command.type === 'message' &&
    session?.active?.first.turnId !== command.turnId
  ) {
    options.warn('The message targets a turn that is not running.')
    return
  }
  const saved = options.store.snapshot.sessions.find(
    (item) => item.sessionId === command.sessionId,
  )
  if (
    (session?.agent ?? saved?.agent ?? command.message.choice.agent) !==
    command.message.choice.agent
  ) {
    await fail(
      options,
      command,
      'session_agent_mismatch',
      'Start a new session for this agent.',
    )
    return
  }
  if (!session) {
    session = {
      id: command.sessionId,
      agent: command.message.choice.agent,
      choice: command.message.choice,
      conversationId: saved?.providerSessionId ?? null,
      provider: null,
      identity: null,
      generation: 0,
      active: null,
    }
    actions.created(session)
    await rememberSession(options.store, session)
  }
  if (session.active) {
    if (command.type === 'turn') {
      await fail(
        options,
        command,
        'turn_running',
        'The session already has a running turn.',
      )
      return
    }
    if (session.active.stopped) return
    if (
      session.active.waiting.length ||
      session.identity !== senderIdentity(command)
    )
      session.active.waiting.push(command)
    else if ((await actions.deliver(command)) === 'deferred')
      session.active?.waiting.push(command)
    return
  }
  session.choice = command.message.choice
  const context = { sessionId: command.sessionId, turnId: command.turnId }
  const { controller } = actions
  const turn: ActiveTurn = {
    first: command,
    startedAt: options.now(),
    messageIds: [command.message.id],
    resolvedMessageIds: new Set(),
    waiting: [],
    stopped: controller.signal.aborted,
    baseline: null,
    controller,
    files: null,
    output: new TurnOutput(context, actions.emit, actions.enqueue),
  }
  session.active = turn
  await actions.emit({
    type: 'turn.started',
    ...context,
    senderId: command.message.sender.id,
    choice: command.message.choice,
    startedAt: turn.startedAt,
    messageIds: turn.messageIds,
  })
  turn.baseline = await cancelable(controller.signal, () =>
    options.checkpoint(controller.signal),
  )
  await actions.start(command)
}

function fail(
  options: EngineOptions,
  command: ProviderInput,
  code: string,
  message: string,
): Promise<void> {
  return options.emit({
    type: 'turn.failed',
    sessionId: command.sessionId,
    turnId: command.turnId,
    error: { code, message },
    retryMessageId: command.message.id,
    durationMs: 0,
  })
}
