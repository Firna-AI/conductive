import type { AgentChatEvent } from '../../src/shared/chat-events'
import { cancelable } from './engine-cancel'
import {
  rememberSession,
  type EngineOptions,
  type SessionRuntime,
  type ActiveTurn,
} from './engine-session'
import type { ProviderEvent, ProviderInput } from './providers/types'
import { TurnOutput } from './turn-output'
import { legacyInstructionBranches } from './instruction-state'
import { BackgroundWait } from './engine-background'

export interface InputActions {
  created: (session: SessionRuntime) => void
  controller: AbortController
  emit: (event: AgentChatEvent) => Promise<void>
  enqueue: (action: () => Promise<void>) => void
  start: (command: ProviderInput) => Promise<void>
  deliver: (command: ProviderInput) => Promise<'sent' | 'deferred' | 'failed'>
  receivedAt: number
  finish: (event: Extract<ProviderEvent, { type: 'result' }>) => Promise<void>
}

export async function inputCommand(
  options: EngineOptions,
  session: SessionRuntime | null,
  command: ProviderInput,
  actions: InputActions,
): Promise<void> {
  actions.controller.signal.throwIfAborted()
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
      actions,
      command,
      'session_agent_mismatch',
      'Start a new session for this agent.',
    )
    return
  }
  if (!session) {
    const built =
      saved?.instructions === undefined
        ? options.instructions(command.branches)
        : null
    const instructions =
      saved?.instructions ?? built?.text[command.message.choice.agent] ?? ''
    session = {
      id: command.sessionId,
      agent: command.message.choice.agent,
      choice: command.message.choice,
      conversationId: saved?.providerSessionId ?? null,
      instructions,
      instructionBranches:
        saved?.instructions === undefined
          ? (built?.branches ?? null)
          : (saved.instructionBranches ??
            legacyInstructionBranches(instructions)),
      generation: 0,
      active: null,
    }
    const created = session
    actions.created(created)
    await cancelable(actions.controller.signal, () =>
      rememberSession(options.store, created),
    )
  }
  actions.controller.signal.throwIfAborted()
  if (session.active) {
    if (command.type === 'turn') {
      await fail(
        actions,
        command,
        'turn_running',
        'The session already has a running turn.',
      )
      return
    }
    if (session.active.stopped) return
    session.active.background?.input(actions.receivedAt)
    if (session.active.waiting.length) session.active.waiting.push(command)
    else if ((await actions.deliver(command)) === 'deferred')
      session.active?.waiting.push(command)
    return
  }
  if (command.type !== 'turn') return
  session.choice = command.message.choice
  const context = { sessionId: command.sessionId, turnId: command.turnId }
  const { controller } = actions
  const turn: ActiveTurn = {
    first: command,
    retryMessageId: command.message.id,
    startedAt: options.now(),
    messageIds: [command.message.id],
    resolvedMessageIds: new Set(),
    waiting: [],
    stopped: controller.signal.aborted,
    provider: null,
    lifetime: null,
    closing: Promise.resolve(),
    baseline: null,
    controller,
    files: null,
    background:
      session.agent === 'claude'
        ? new BackgroundWait(
            options.now,
            () =>
              actions.enqueue(async () => {
                if (session.active === turn && turn.background?.shouldExpire())
                  await actions.finish({
                    type: 'result',
                    state: 'finished',
                    userMessageIds: [],
                    endReason: 'background_work_limit',
                  })
              }),
            options.backgroundWorkLimitMs,
          )
        : null,
    output: new TurnOutput(context, actions.emit, actions.enqueue),
  }
  session.active = turn
  controller.signal.throwIfAborted()
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
  actions: InputActions,
  command: ProviderInput,
  code: string,
  message: string,
): Promise<void> {
  actions.controller.signal.throwIfAborted()
  return actions.emit({
    type: 'turn.failed',
    sessionId: command.sessionId,
    turnId: command.turnId,
    error: { code, message },
    retryMessageId: command.message.id,
    durationMs: 0,
  })
}
