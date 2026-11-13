import type { AgentChatEvent } from '../../src/shared/generated/AgentChatEvent'
import type { RunnerChangeModel } from '../../src/shared/generated/RunnerChangeModel'
import type { RunnerInterrupt } from '../../src/shared/generated/RunnerInterrupt'
import type { ProviderEvent } from '../sdk-helper/src/generated/ProviderEvent'
import type { ProviderInput } from '../sdk-helper/src/generated/ProviderInput'
import { cancelable } from './engine-cancel'
import { disposeProvider } from './engine-disposal'
import { providerEvent } from './engine-events'
import { finishTurn } from './engine-finish'
import { inputCommand } from './engine-input'
import { PendingTurns, stoppedBeforeStart } from './engine-pending'
import {
  deliverInput,
  startProvider,
  type ActiveTurn,
  type EngineOptions,
  type SessionRuntime,
} from './engine-session'
import { failureCause } from '../sdk-helper/src/providers/failure'

type Command = ProviderInput | RunnerChangeModel | RunnerInterrupt

export class SessionEngine {
  private readonly options: EngineOptions
  private session: SessionRuntime | null = null
  private pending: Promise<void> = Promise.resolve()
  private readonly starts: PendingTurns
  private closed = false
  private closing: Promise<void> | null = null

  constructor(options: EngineOptions) {
    this.options = options
    this.starts = new PendingTurns(options)
  }

  command(command: Command): Promise<void> {
    if (this.closed) return Promise.resolve()
    const receivedAt = this.options.now()
    if (command.type === 'interrupt') {
      if (this.starts.hasEnded(command.turnId)) return Promise.resolve()
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
      const stopped = this.starts.stop(command.turnId)
      if (stopped) return stopped
      return this.starts.end(command.turnId, () =>
        this.enqueue(() => this.emit(stoppedBeforeStart(command))),
      )
    }
    if (command.type === 'turn') this.starts.accept(command)
    const controller =
      command.type === 'turn'
        ? this.starts.controller(command.turnId)
        : undefined
    return this.enqueue(async () => {
      try {
        if (command.type === 'model') {
          const session = this.session
          if (session?.agent === command.choice.agent) {
            session.choice = command.choice
            const turn = session.active
            if (turn?.provider) {
              const provider = turn.provider
              await cancelable(turn.controller.signal, () =>
                provider.model(command.choice),
              )
            }
          }
        } else {
          if (command.type === 'turn') await this.starts.wait(command.turnId)
          await this.input(command, receivedAt)
        }
      } catch (error) {
        if (
          command.type !== 'model' &&
          controller?.signal.aborted &&
          this.session?.active?.first.turnId !== command.turnId
        )
          return
        if (
          !this.closed &&
          this.session?.active &&
          (command.type === 'model' ||
            this.session.active.first.turnId === command.turnId)
        )
          await this.finish(failureCause(error))
        else if (!this.closed && command.type === 'turn') {
          const failure = failureCause(error)
          await this.emit({
            type: 'turn.failed',
            sessionId: command.sessionId,
            turnId: command.turnId,
            error: { code: failure.code, message: failure.message },
            retryMessageId: command.message.id,
            durationMs: 0,
          })
        } else if (!this.closed)
          this.options.warn('The agent command could not finish.')
      } finally {
        if (command.type === 'turn') this.starts.remove(command.turnId)
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

  close(): Promise<void> {
    if (this.closing) return this.closing
    this.closed = true
    const session = this.session
    const turn = session?.active
    if (turn) this.starts.remove(turn.first.turnId)
    const pendingEnds = this.starts.close()
    if (turn) this.cancel(turn)
    this.closing = Promise.all([this.pending, pendingEnds]).then(async () => {
      if (turn && session?.active === turn)
        await this.finish({
          type: 'result',
          state: 'stopped',
          userMessageIds: turn.messageIds,
        })
      else await turn?.closing
    })
    return this.closing
  }

  private cancel(turn: ActiveTurn): void {
    turn.background?.close()
    turn.stopped = true
    turn.waiting.length = 0
    turn.controller.abort()
    const session = this.session
    if (!session) return
    session.generation++
    void disposeProvider(turn, 'stop').catch(() =>
      this.options.warn('The canceled agent could not close.'),
    )
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    this.pending = this.pending
      .then(action)
      .catch(() => this.options.warn('The agent command could not finish.'))
    return this.pending
  }

  private async input(
    command: ProviderInput,
    receivedAt: number,
  ): Promise<void> {
    const turn = this.session?.active
    const wasWaiting = turn?.background?.waiting
    await inputCommand(this.options, this.session, command, {
      created: (session) => {
        this.session = session
      },
      controller:
        command.type === 'message' && this.session?.active
          ? this.session.active.controller
          : (this.starts.controller(command.turnId) ?? new AbortController()),
      emit: (event) => this.emit(event),
      enqueue: (action) => {
        void this.enqueue(action)
      },
      start: (input) => this.start(input),
      deliver: (input) => this.deliver(input),
      receivedAt,
      finish: (event) => this.finish(event),
    })
    if (wasWaiting && this.session?.active === turn && turn?.waiting.length)
      await this.event({
        type: 'result',
        state: 'finished',
        userMessageIds: [],
      })
  }

  private async start(command: ProviderInput): Promise<void> {
    const session = this.session
    if (!session) return
    const generation = ++session.generation
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
