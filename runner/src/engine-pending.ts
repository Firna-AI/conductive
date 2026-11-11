import type { AgentChatEvent } from '../../src/shared/chat-events'
import type { RunnerTurnV2 as RunnerTurn } from '../../src/shared/runner'
import { cancelable } from './engine-cancel'
import type { EngineOptions } from './engine-session'

interface PendingTurn {
  command: RunnerTurn
  controller: AbortController
  accepted: Promise<void>
}

/** Keep accepted starts available to Stop and shutdown while their saves wait. */
export class PendingTurns {
  private readonly turns = new Map<string, PendingTurn>()
  private readonly ended = new Map<string, Promise<void>>()
  private readonly options: EngineOptions
  constructor(options: EngineOptions) {
    this.options = options
  }

  accept(command: RunnerTurn): PendingTurn {
    const turn = {
      command,
      controller: new AbortController(),
      accepted: this.options.store.acceptTurn({
        sessionId: command.sessionId,
        turnId: command.turnId,
        startedAt: this.options.now(),
        messageIds: [command.message.id],
      }),
    }
    this.turns.set(command.turnId, turn)
    // The session queue observes the rejection when this start reaches it.
    void turn.accepted.catch(() => {})
    return turn
  }

  controller(turnId: string): AbortController | undefined {
    return this.turns.get(turnId)?.controller
  }

  async wait(turnId: string): Promise<void> {
    const turn = this.turns.get(turnId)
    if (turn) await cancelable(turn.controller.signal, () => turn.accepted)
  }

  hasEnded(turnId: string): boolean {
    return this.ended.has(turnId)
  }

  remove(turnId: string): void {
    this.turns.delete(turnId)
  }

  stop(turnId: string): Promise<void> | null {
    const end = this.ended.get(turnId)
    if (end) return end
    const turn = this.turns.get(turnId)
    if (!turn) return null
    turn.controller.abort()
    return this.end(turnId, () =>
      this.options.emit(stoppedBeforeStart(turn.command)),
    )
  }

  end(turnId: string, emit: () => Promise<void>): Promise<void> {
    const end = this.ended.get(turnId)
    if (end) return end
    const stopped = emit()
    this.ended.set(turnId, stopped)
    void stopped.catch(() => {
      if (this.ended.get(turnId) === stopped) this.ended.delete(turnId)
    })
    return stopped
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.turns.keys()].flatMap((id) => this.stop(id) ?? []),
    )
    await Promise.all(this.ended.values())
  }
}

export function stoppedBeforeStart(command: {
  sessionId: string
  turnId: string
}): AgentChatEvent {
  return {
    type: 'turn.completed',
    sessionId: command.sessionId,
    turnId: command.turnId,
    state: 'stopped',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [],
  }
}
