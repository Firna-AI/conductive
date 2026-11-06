import type { AgentChatEvent } from '../../src/shared/chat-events'
import type { RunnerCommand } from '../../src/shared/runner'
import type { ProviderEvent, ProviderInput } from './providers/types'
import {
  deliverInput,
  rememberSession,
  senderIdentity,
  startProvider,
  type EngineOptions,
  type SessionRuntime,
} from './engine-session'
import { TurnOutput } from './turn-output'
import { finishTurn } from './engine-finish'
import { failureCause } from './providers/failure'

/** Commands and provider callbacks share one queue. SDK work remains concurrent. */
export class AgentEngine {
  private readonly options: EngineOptions
  private readonly sessions = new Map<string, SessionRuntime>()
  private readonly commands = new Set<string>()
  private pending: Promise<void> = Promise.resolve()

  constructor(options: EngineOptions) {
    this.options = options
  }

  command(command: RunnerCommand): Promise<void> {
    return this.enqueue(async () => {
      if (command.type === 'file.read' || command.type === 'file.diff') return
      if (this.commands.has(command.commandId)) return
      this.commands.add(command.commandId)
      if (command.type === 'model') {
        const session = this.sessions.get(command.sessionId)
        if (session && session.agent === command.choice.agent) {
          session.choice = command.choice
          await session.provider?.model(command.choice)
        }
        return
      }
      if (command.type === 'interrupt') {
        const session = this.sessions.get(command.sessionId)
        if (session?.active?.first.turnId === command.turnId) {
          session.active.stopped = true
          session.active.waiting.length = 0
          const turn = session.active
          const provider = session.provider
          session.generation++
          session.provider = null
          await provider?.stop()
          await this.finish(session, {
            type: 'result',
            state: 'stopped',
            userMessageIds: turn.messageIds,
          })
        } else
          await this.emit({
            type: 'turn.completed',
            sessionId: command.sessionId,
            turnId: command.turnId,
            state: 'stopped',
            durationMs: 0,
            files: [],
            omittedFileCount: 0,
            userMessageIds: [],
          })
        return
      }
      if (
        command.type === 'message' &&
        this.sessions.get(command.sessionId)?.active?.first.turnId !==
          command.turnId
      ) {
        this.options.warn('The message targets a turn that is not running.')
        return
      }
      let session = this.sessions.get(command.sessionId)
      const saved = this.options.store.snapshot.sessions.find(
        (item) => item.sessionId === command.sessionId,
      )
      if (
        (session?.agent ?? saved?.agent ?? command.message.choice.agent) !==
        command.message.choice.agent
      ) {
        await this.failCommand(
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
        this.sessions.set(session.id, session)
        await rememberSession(this.options.store, session)
      }
      if (session.active) {
        if (command.type === 'turn') {
          await this.failCommand(
            command,
            'turn_running',
            'The session already has a running turn.',
          )
          return
        }
        if (
          session.active.waiting.length ||
          session.identity !== senderIdentity(command)
        )
          session.active.waiting.push(command)
        else {
          const control = await this.deliver(session, command)
          if (control === 'deferred') session.active?.waiting.push(command)
        }
        return
      }
      session.choice = command.message.choice
      const context = { sessionId: command.sessionId, turnId: command.turnId }
      session.active = {
        first: command,
        startedAt: this.options.now(),
        messageIds: [command.message.id],
        resolvedMessageIds: new Set(),
        waiting: [],
        stopped: false,
        baseline: await this.options.checkpoint(),
        output: new TurnOutput(
          context,
          (event) => this.emit(event),
          (action) => {
            void this.enqueue(action)
          },
        ),
      }
      await this.emit({
        type: 'turn.started',
        ...context,
        senderId: command.message.sender.id,
        choice: command.message.choice,
        startedAt: session.active.startedAt,
        messageIds: [command.message.id],
      })
      await this.start(session, command)
    })
  }

  async idle(): Promise<void> {
    let pending
    do {
      pending = this.pending
      await pending
    } while (pending !== this.pending)
    for (const session of this.sessions.values())
      await session.active?.output.flush()
  }

  async close(): Promise<void> {
    await this.idle()
    await Promise.all(
      [...this.sessions.values()].map(async (session) => {
        session.generation++
        await session.provider?.close()
      }),
    )
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const result = this.pending.then(action)
    this.pending = result.catch(() =>
      this.options.warn('The agent command could not finish.'),
    )
    return this.pending
  }

  private async start(
    session: SessionRuntime,
    command: ProviderInput,
  ): Promise<void> {
    try {
      const generation =
        session.provider && session.identity === senderIdentity(command)
          ? session.generation
          : ++session.generation
      await startProvider(this.options, session, command, (event) => {
        void this.enqueue(async () => {
          if (generation === session.generation)
            await this.event(session, event)
        })
      })
    } catch (error) {
      await this.finish(session, failureCause(error))
    }
  }

  private async event(
    session: SessionRuntime,
    event: ProviderEvent,
  ): Promise<void> {
    if (event.type === 'conversation') {
      if (session.conversationId !== event.id) {
        session.conversationId = event.id
        await rememberSession(this.options.store, session)
      }
      return
    }
    const turn = session.active
    if (!turn) return
    await turn.output.accept(event)
    if (
      event.type === 'tool' &&
      event.tool.state === 'running' &&
      turn.waiting.length
    )
      await session.provider?.interrupt()
    if (event.type === 'result' || event.type === 'failed') {
      if (event.type === 'result') {
        const answered = event.userMessageIds.length
          ? event.userMessageIds
          : turn.messageIds
        for (const id of answered) turn.resolvedMessageIds.add(id)
        // A text-only SDK response can finish before its queued input runs.
        if (
          !turn.stopped &&
          turn.messageIds.some((id) => !turn.resolvedMessageIds.has(id))
        )
          return
      } else if (!turn.stopped && turn.waiting.length) {
        for (const id of turn.messageIds) turn.resolvedMessageIds.add(id)
      }
      const next = !turn.stopped ? turn.waiting.shift() : undefined
      if (next) {
        await turn.output.finish('stopped')
        session.generation++
        await session.provider?.close()
        session.provider = null
        turn.messageIds.push(next.message.id)
        await this.start(session, next)
        while (
          turn.waiting.length &&
          senderIdentity(turn.waiting[0]) === session.identity
        ) {
          const message = turn.waiting.shift()
          if (message) {
            const control = await this.deliver(session, message)
            if (control === 'deferred') turn.waiting.unshift(message)
            if (control !== 'sent') break
          }
        }
      } else await this.finish(session, event)
    }
  }

  private async finish(
    session: SessionRuntime,
    event: Extract<ProviderEvent, { type: 'result' | 'failed' }>,
  ): Promise<void> {
    await finishTurn(this.options, session, event, (event) => this.emit(event))
  }

  private deliver(
    session: SessionRuntime,
    command: ProviderInput,
  ): Promise<'sent' | 'deferred' | 'failed'> {
    return deliverInput(session, command, (event) => this.event(session, event))
  }

  private emit(event: AgentChatEvent): Promise<void> {
    return this.options.emit(event)
  }

  private async failCommand(
    command: ProviderInput,
    code: string,
    message: string,
  ): Promise<void> {
    await this.emit({
      type: 'turn.failed',
      sessionId: command.sessionId,
      turnId: command.turnId,
      error: { code, message },
      retryMessageId: command.message.id,
      durationMs: 0,
    })
  }
}
