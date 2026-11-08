import type { Session } from '../../src/shared/sessions'
import { HttpError } from '../http'
import { continueUnanswered } from './continuation'
import type { ChatTransaction } from './store'
import type { PendingCommand, StoredTurn } from './types'

type TurnEnd =
  | { state: 'stopped' }
  | { state: 'failed'; retryMessageId?: string }
  | { state: 'finished'; randomId: () => string }

/** Owns the active turn and its stored chain of waiting turns. */
export class TurnLifecycle {
  private readonly transaction: ChatTransaction
  private readonly session: Session

  constructor(transaction: ChatTransaction, session: Session) {
    this.transaction = transaction
    this.session = session
  }

  async select(senderId: string, randomId: () => string): Promise<StoredTurn> {
    let turn = this.session.activeTurnId
      ? await this.transaction.turn(this.session.activeTurnId)
      : undefined
    while (turn) {
      if (!turn.nextTurnId && turn.state !== 'stopping') return turn
      const following = turn.nextTurnId
        ? await this.transaction.turn(turn.nextTurnId)
        : undefined
      if (following) {
        turn = following
      } else {
        const waiting = this.create(senderId, randomId())
        turn.nextTurnId = waiting.id
        await this.transaction.saveTurn(turn)
        await this.transaction.saveTurn(waiting)
        return waiting
      }
    }
    turn = this.create(senderId, randomId())
    this.session.activeTurnId = turn.id
    await this.transaction.saveTurn(turn)
    return turn
  }

  async canDispatch(command: PendingCommand): Promise<boolean> {
    if (command.type === 'model') {
      const active = this.session.activeTurnId
        ? await this.transaction.turn(this.session.activeTurnId)
        : undefined
      return active?.state !== 'queued'
    }
    if (
      this.session.closedAt !== null ||
      this.session.activeTurnId !== command.turnId
    )
      return false
    const turn = await this.transaction.turn(command.turnId)
    if (command.type === 'interrupt') return turn?.state === 'stopping'
    if (command.type === 'message') return turn?.state === 'running'
    return turn?.state === 'queued' || turn?.state === 'running'
  }

  async finish(turn: StoredTurn, end: TurnEnd): Promise<void> {
    turn.started ??= turn.state === 'running' || turn.state === 'stopping'
    let following = turn.nextTurnId ?? null
    if (end.state === 'finished' && !turn.closeAfterStop) {
      const continuation = await continueUnanswered(
        this.transaction,
        turn,
        end.randomId,
      )
      if (continuation) {
        continuation.nextTurnId = following
        await this.transaction.saveTurn(continuation)
        if ((await this.transaction.newestTurn(this.session.id)) === turn.id)
          await this.transaction.saveNewestTurn(
            this.session.id,
            continuation.id,
          )
        following = continuation.id
      }
    }
    turn.state = end.state
    turn.nextTurnId = null
    await this.removeCommands(turn.id)
    await this.transaction.saveTurn(turn)
    if (this.session.activeTurnId === turn.id) {
      this.session.retryMessageId =
        end.state === 'failed' &&
        (await this.transaction.newestTurn(this.session.id)) === turn.id
          ? (end.retryMessageId ?? null)
          : null
      this.session.activeTurnId = turn.closeAfterStop ? null : following
      if (turn.closeAfterStop) {
        this.session.closedAt = this.transaction.now
        await this.cancelWaiting(following)
      }
    } else {
      await this.unlink(turn.id, following)
    }
    await this.saveSession()
  }

  async stop(turnId: string, commandId: string) {
    const turn = await this.transaction.turn(turnId)
    if (!turn || turn.sessionId !== this.session.id) {
      throw new HttpError(404, 'turn_not_found', 'The turn is not available.')
    }
    if (
      turn.state === 'finished' ||
      turn.state === 'failed' ||
      turn.state === 'stopped'
    ) {
      return { turnId, state: 'stopped' as const }
    }
    if (turn.state === 'queued') {
      await this.stopQueued(turn)
      return { turnId, state: 'stopped' as const }
    }
    if (turn.state !== 'stopping') {
      turn.state = 'stopping'
      await this.transaction.saveTurn(turn)
      await this.transaction.saveCommand({
        type: 'interrupt',
        commandId,
        sessionId: this.session.id,
        turnId,
      })
    }
    return { turnId, state: 'stopping' as const }
  }

  async close(stopRunning: boolean, commandId: string): Promise<Session> {
    const turn = this.session.activeTurnId
      ? await this.transaction.turn(this.session.activeTurnId)
      : undefined
    if (turn) {
      if (turn.state !== 'queued' && !stopRunning) {
        throw new HttpError(
          409,
          'stop_confirmation_required',
          'Confirm Stop to close this session.',
        )
      }
      turn.closeAfterStop = true
      await this.transaction.saveTurn(turn)
      await this.stop(turn.id, commandId)
    } else if (this.session.closedAt === null) {
      this.session.closedAt = this.transaction.now
      await this.saveSession()
    }
    return this.session
  }

  private create(senderId: string, id: string): StoredTurn {
    return {
      id,
      sessionId: this.session.id,
      senderId,
      messageIds: [],
      state: 'queued',
      closeAfterStop: false,
      nextTurnId: null,
    }
  }

  private async stopQueued(turn: StoredTurn): Promise<void> {
    await this.transaction.emit({
      type: 'turn.completed',
      sessionId: this.session.id,
      turnId: turn.id,
      state: 'stopped',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: turn.messageIds,
    })
    await this.finish(turn, { state: 'stopped' })
  }

  private async cancelWaiting(turnId: string | null): Promise<void> {
    while (turnId) {
      const waiting = await this.transaction.turn(turnId)
      if (!waiting) return
      turnId = waiting.nextTurnId ?? null
      if (waiting.state === 'queued') await this.stopQueued(waiting)
    }
  }

  private async unlink(
    turnId: string,
    following: string | null,
  ): Promise<void> {
    let currentId = this.session.activeTurnId
    while (currentId) {
      const current = await this.transaction.turn(currentId)
      if (!current) return
      if (current.nextTurnId === turnId) {
        current.nextTurnId = following
        await this.transaction.saveTurn(current)
        return
      }
      currentId = current.nextTurnId ?? null
    }
  }

  private async removeCommands(turnId: string): Promise<void> {
    for (const command of await this.transaction.pending()) {
      if ('turnId' in command && command.turnId === turnId)
        await this.transaction.removeCommand(command.commandId)
    }
  }

  private async saveSession(): Promise<void> {
    await this.transaction.saveSession(this.session)
    await this.transaction.emit({
      type: 'session.updated',
      session: this.session,
    })
  }
}
