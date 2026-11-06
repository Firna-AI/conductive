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

export interface ActiveTurn {
  first: ProviderInput
  startedAt: number
  messageIds: string[]
  /** Includes inputs consumed by an SDK result or closed by a failed segment. */
  resolvedMessageIds: Set<string>
  waiting: ProviderInput[]
  output: TurnOutput
  stopped: boolean
  baseline: Checkpoint
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
  checkpoint: () => Promise<Checkpoint>
  changedSince: (baseline: Checkpoint) => Promise<readonly ChangedFile[]>
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
  if (session.provider && session.identity !== senderIdentity(command)) {
    await session.provider.close()
    session.provider = null
  }
  session.choice = command.message.choice
  if (!session.provider) {
    session.identity = senderIdentity(command)
    session.provider = await options.providers[session.agent]({
      cwd: options.cwd,
      home: options.home,
      computerMcpUrl: options.computerMcpUrl,
      login: command.login,
      choice: session.choice,
      conversationId: session.conversationId,
      event,
    })
  } else await session.provider.model(session.choice)
  await session.provider.send(command)
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
    if ((await provider.model(session.choice)) === 'deferred') return 'deferred'
    turn.messageIds.push(command.message.id)
    await provider.send(command)
    return 'sent'
  } catch (error) {
    if (!turn.messageIds.includes(command.message.id))
      turn.messageIds.push(command.message.id)
    await failed(failureCause(error))
    return 'failed'
  }
}
