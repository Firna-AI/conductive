import type { AgentChatEvent } from '../../src/shared/chat-events'
import type {
  RunnerChangeModel,
  RunnerInterrupt,
} from '../../src/shared/runner'
import type { ProviderEvent, ProviderInput } from './providers/types'
import { cancelable } from './engine-cancel'
import { providerEvent } from './engine-events'
import { finishTurn } from './engine-finish'
import { inputCommand } from './engine-input'
import {
  deliverInput,
  senderIdentity,
  startProvider,
  type ActiveTurn,
  type EngineOptions,
  type SessionRuntime,
} from './engine-session'
import { failureCause } from './providers/failure'

type Command = ProviderInput | RunnerChangeModel | RunnerInterrupt

export class SessionEngine {
  private readonly options: EngineOptions
  private session: SessionRuntime | null = null
  private pending: Promise<void> = Promise.resolve()
  private readonly starts = new Map<string, AbortController>()
  private readonly stoppedBeforeStart = new Set<string>()
  private closed = false

  constructor(options: EngineOptions) {
    this.options = options
  }

  command(command: Command): Promise<void> {
    if (command.type === 'interrupt') {
      if (this.stoppedBeforeStart.has(command.turnId)) return Promise.resolve()
      const turn = this.session?.active
      if (turn?.first.turnId === command.turnId) {
        this.cancel(turn)
        return this.enqueue(async () => {
          if (this.session?.active === turn)
            await this.finish({
              type: 'result',
              state: 'stopped',
              userMessageIds: turn.messageIds,
            })
        })
      }
      const start = this.starts.get(command.turnId)
      if (start) {
        this.stoppedBeforeStart.add(command.turnId)
        start.abort()
        const session = this.session
        if (session && !session.active) {
          session.generation++
          const provider = session.provider
          session.provider = null
          void provider
            ?.close()
            .catch(() =>
              this.options.warn('The canceled agent could not close.'),
            )
        }
        return this.emit({
          type: 'turn.completed',
          sessionId: command.sessionId,
          turnId: command.turnId,
          state: 'stopped',
          durationMs: 0,
          files: [],
          omittedFileCount: 0,
          userMessageIds: [],
        })
      }
      return this.enqueue(() =>
        this.emit({
          type: 'turn.completed',
          sessionId: command.sessionId,
          turnId: command.turnId,
          state: 'stopped',
          durationMs: 0,
          files: [],
          omittedFileCount: 0,
          userMessageIds: [],
        }),
      )
    }
    if (command.type === 'turn')
      this.starts.set(command.turnId, new AbortController())
    const controller =
      command.type === 'turn' ? this.starts.get(command.turnId) : undefined
    return this.enqueue(async () => {
      try {
        if (command.type === 'model') {
          const session = this.session
          if (session?.agent === command.choice.agent) {
            session.choice = command.choice
            if (session.provider && session.active) {
              const provider = session.provider
              await cancelable(session.active.controller.signal, () =>
                provider.model(command.choice),
              )
            }
          }
        } else await this.input(command)
      } catch (error) {
        if (
          command.type !== 'model' &&
          controller?.signal.aborted &&
          this.session?.active?.first.turnId !== command.turnId
        )
          return
        if (!this.closed && this.session?.active)
          await this.finish(failureCause(error))
        else if (!this.closed)
          this.options.warn('The agent command could not finish.')
      } finally {
        if (command.type === 'turn') this.starts.delete(command.turnId)
      }
    })
  }

  async idle(): Promise<void> {
    let pending
    do {
      pending = this.pending
      await pending
    } while (pending !== this.pending)
    await this.session?.active?.output.flush()
  }

  async close(): Promise<void> {
    this.closed = true
    for (const start of this.starts.values()) start.abort()
    const session = this.session
    if (session) {
      session.generation++
      session.active?.controller.abort()
      const provider = session.provider
      session.provider = null
      await Promise.all([this.pending, provider?.close()])
    } else await this.pending
  }

  private cancel(turn: ActiveTurn): void {
    turn.stopped = true
    turn.waiting.length = 0
    turn.controller.abort()
    const session = this.session
    if (!session) return
    session.generation++
    const provider = session.provider
    session.provider = null
    void provider
      ?.stop()
      .catch(() => this.options.warn('The canceled agent could not close.'))
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    this.pending = this.pending
      .then(action)
      .catch(() => this.options.warn('The agent command could not finish.'))
    return this.pending
  }

  private input(command: ProviderInput): Promise<void> {
    return inputCommand(this.options, this.session, command, {
      created: (session) => {
        this.session = session
      },
      controller:
        command.type === 'message' && this.session?.active
          ? this.session.active.controller
          : (this.starts.get(command.turnId) ?? new AbortController()),
      emit: (event) => this.emit(event),
      enqueue: (action) => {
        void this.enqueue(action)
      },
      start: (input) => this.start(input),
      deliver: (input) => this.deliver(input),
    })
  }

  private async start(command: ProviderInput): Promise<void> {
    const session = this.session
    if (!session) return
    const generation =
      session.provider && session.identity === senderIdentity(command)
        ? session.generation
        : ++session.generation
    await startProvider(this.options, session, command, (event) => {
      const turn = session.active
      if (this.closed || generation !== session.generation) return
      void this.enqueue(async () => {
        if (this.closed || turn !== session.active) return
        if (generation !== session.generation && !turn?.stopped) return
        if (
          turn?.stopped &&
          (event.type === 'result' ||
            event.type === 'failed' ||
            event.type === 'conversation')
        )
          return
        try {
          await this.event(event, true)
        } catch (error) {
          if (session.active && !this.closed)
            await this.finish(failureCause(error))
        }
      })
    })
  }

  private async event(
    event: ProviderEvent,
    acceptedBeforeStop = false,
  ): Promise<void> {
    if (this.session)
      await providerEvent(
        this.options,
        this.session,
        event,
        {
          start: (command) => this.start(command),
          deliver: (command) => this.deliver(command),
          finish: (result) => this.finish(result),
        },
        acceptedBeforeStop,
      )
  }

  private finish(
    event: Extract<ProviderEvent, { type: 'result' | 'failed' }>,
  ): Promise<void> {
    return this.session
      ? finishTurn(this.options, this.session, event, (event) =>
          this.emit(event),
        )
      : Promise.resolve()
  }

  private deliver(
    command: ProviderInput,
  ): Promise<'sent' | 'deferred' | 'failed'> {
    return this.session
      ? deliverInput(this.session, command, (event) => this.event(event))
      : Promise.resolve('failed')
  }

  private emit(event: AgentChatEvent): Promise<void> {
    return this.options.emit(event)
  }
}
