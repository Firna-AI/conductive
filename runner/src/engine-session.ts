import type { Agent, AgentChoice } from '../../src/shared/agents'
import type { AgentChatEvent } from '../../src/shared/chat-events'
import type { ChangedFile } from '../../src/shared/files'
import type { Checkpoint } from './checkpoint'
import type {
  ProviderEvent,
  ProviderFactory,
  ProviderInput,
  ProviderProcess,
} from './providers/types'
import type { EventStore } from './state'
import type { TurnOutput } from './turn-output'
import { failureCause } from './providers/failure'
import { cancelable } from './engine-cancel'
import { disposeProvider } from './engine-disposal'

export interface ActiveTurn {
  first: ProviderInput
  retryMessageId: string
  startedAt: number
  messageIds: string[]
  /** Includes inputs consumed by an SDK result or closed by a failed segment. */
  resolvedMessageIds: Set<string>
  waiting: ProviderInput[]
  output: TurnOutput
  stopped: boolean
  shutdown: boolean
  closing: Promise<void>
  baseline: Checkpoint | null
  controller: AbortController
  files: readonly ChangedFile[] | null
}

export interface SessionRuntime {
  id: string
  agent: Agent
  choice: AgentChoice
  conversationId: string | null
  provider: ProviderProcess | null
  identity: string | null
  generation: number
  active: ActiveTurn | null
}

export interface EngineOptions {
  cwd: string
  home: string
  computerMcpUrl: string
  providers: Record<Agent, ProviderFactory>
  store: EventStore
  now: () => number
  emit: (event: AgentChatEvent) => Promise<void>
  checkpoint: (signal: AbortSignal) => Promise<Checkpoint>
  changedSince: (
    baseline: Checkpoint,
    signal: AbortSignal,
  ) => Promise<readonly ChangedFile[]>
  warn: (message: string) => void
}

export function senderIdentity(command: ProviderInput): string {
  return JSON.stringify([
    command.message.sender.id,
    command.login.agent,
    command.login.kind,
    command.login.secret,
  ])
}

export function rememberSession(
  store: EventStore,
  session: SessionRuntime,
): Promise<void> {
  return store.remember({
    sessionId: session.id,
    agent: session.agent,
    providerSessionId: session.conversationId,
  })
}

export async function startProvider(
  options: EngineOptions,
  session: SessionRuntime,
  command: ProviderInput,
  event: (event: ProviderEvent) => void,
): Promise<void> {
  const turn = session.active
  if (!turn) return
  const signal = turn.controller.signal
  signal.throwIfAborted()
  if (session.provider && session.identity !== senderIdentity(command)) {
    const closing = disposeProvider(session)
    await cancelable(signal, () => closing)
  }
  session.choice = command.message.choice
  if (!session.provider) {
    session.identity = senderIdentity(command)
    const dispose = (provider: ProviderProcess) => {
      void provider
        .close()
        .catch(() => options.warn('The canceled agent could not close.'))
    }
    const provider = await cancelable(
      signal,
      () =>
        options.providers[session.agent]({
          cwd: options.cwd,
          home: options.home,
          computerMcpUrl: options.computerMcpUrl,
          login: command.login,
          choice: session.choice,
          conversationId: session.conversationId,
          event,
          signal,
        }),
      dispose,
    )
    if (signal.aborted) {
      dispose(provider)
      signal.throwIfAborted()
    }
    session.provider = provider
  } else
    await cancelable(
      signal,
      () =>
        session.provider?.model(session.choice) ?? Promise.resolve('applied'),
    )
  const provider = session.provider
  await cancelable(signal, () => provider.send(command))
}

export async function deliverInput(
  session: SessionRuntime,
  command: ProviderInput,
  failed: (event: Extract<ProviderEvent, { type: 'failed' }>) => Promise<void>,
): Promise<'sent' | 'deferred' | 'failed'> {
  const turn = session.active
  if (!turn) return 'failed'
  try {
    const provider = session.provider
    if (!provider) throw new Error('The agent is unavailable. Try again.')
    session.choice = command.message.choice
    const signal = turn.controller.signal
    if (
      (await cancelable(signal, () => provider.model(session.choice))) ===
      'deferred'
    )
      return 'deferred'
    signal.throwIfAborted()
    turn.messageIds.push(command.message.id)
    await cancelable(signal, () => provider.send(command))
    return 'sent'
  } catch (error) {
    if (turn.controller.signal.aborted) return 'failed'
    if (!turn.messageIds.includes(command.message.id))
      turn.messageIds.push(command.message.id)
    await failed(failureCause(error))
    return 'failed'
  }
}
