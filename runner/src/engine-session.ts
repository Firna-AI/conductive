import type { Agent, AgentChoice } from '../../src/shared/agents'
import type { AgentChatEvent, TurnSpeed } from '../../src/shared/chat-events'
import type { ChangedFile } from '../../src/shared/files'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { RunnerTurn } from '../../src/shared/runner'
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
import { ProviderLifetime } from './providers/lifetime'
import type { WorkspaceToolRuntime } from './providers/workspace-tools'
import type { RunnerBranches } from '../../src/shared/runner'
import type { BuiltInstructions } from './instruction-state'
import type { BackgroundWait } from './engine-background'

export interface ActiveTurn {
  first: RunnerTurn
  retryMessageId: string
  startedAt: number
  messageIds: string[]
  /** Includes inputs consumed by an SDK result or closed by a failed segment. */
  resolvedMessageIds: Set<string>
  waiting: ProviderInput[]
  output: TurnOutput
  speed?: TurnSpeed
  stopped: boolean
  provider: ProviderProcess | null
  lifetime: ProviderLifetime | null
  closing: Promise<void>
  baseline: Checkpoint | null
  controller: AbortController
  files: readonly ChangedFile[] | null
  background: BackgroundWait | null
  backgroundNoteIds: Set<string>
}

export interface SessionRuntime {
  id: string
  agent: Agent
  choice: AgentChoice
  conversationId: string | null
  instructions: string
  instructionBranches: RunnerBranches | null
  generation: number
  active: ActiveTurn | null
}

export interface EngineOptions {
  cwd: string
  home: string
  instructions: (branches?: RunnerBranches) => BuiltInstructions
  tools: WorkspaceToolRuntime
  providers: Record<Agent, ProviderFactory>
  store: EventStore
  now: () => number
  /** Internal dependency injection. The service uses the fixed two-hour limit. */
  backgroundWorkLimitMs?: number
  emit: (event: AgentChatEvent) => Promise<void>
  checkpoint: (signal: AbortSignal) => Promise<Checkpoint>
  changedSince: (
    baseline: Checkpoint,
    signal: AbortSignal,
  ) => Promise<readonly ChangedFile[]>
  warn: (message: string) => void
}

export function rememberSession(
  store: EventStore,
  session: SessionRuntime,
): Promise<void> {
  return store.remember({
    sessionId: session.id,
    agent: session.agent,
    providerSessionId: session.conversationId,
    instructions: session.instructions,
    instructionBranches: session.instructionBranches,
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
  if (
    !options.store.snapshot.sessions.some(
      (saved) =>
        saved.sessionId === session.id &&
        saved.instructions === session.instructions,
    )
  )
    await cancelable(signal, () => rememberSession(options.store, session))
  session.choice = command.message.choice
  const lifetime = new ProviderLifetime()
  turn.lifetime = lifetime
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
        sessionId: session.id,
        endpoint: new URL(
          session.agent === 'claude'
            ? MACHINE_PATHS.claudeGateway
            : MACHINE_PATHS.codexGateway,
          options.tools.machineOrigin,
        ).href,
        credential: { type: 'gateway', ...turn.first.credential },
        commitAuthor: turn.first.commitAuthor,
        choice: session.choice,
        conversationId: session.conversationId,
        instructions: session.instructions,
        instructionBranches: session.instructionBranches,
        tools: { ...options.tools, turnId: turn.first.turnId },
        event,
        warn: options.warn,
        signal,
        lifetime,
        backgroundNoteIds: turn.backgroundNoteIds,
      }),
    dispose,
  )
  if (signal.aborted) {
    dispose(provider)
    signal.throwIfAborted()
  }
  turn.provider = provider
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
    const provider = turn.provider
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
