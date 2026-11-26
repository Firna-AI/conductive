import type { Session } from '../../src/shared/generated/Session'

import { continueUnanswered } from './continuation'
import { firstStopRequester } from './stop-request'
import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'
import { readySessionWatches } from './session-watch-end'

export type TurnEnd =
  | { state: 'stopped' }
  | {
      state: 'failed'
      retryMessageId?: string
      error?: { code: string; message: string }
    }
  | { state: 'finished'; randomId: () => string }

/** Commit an end and advance the session and its waiting turns together. */
export class TurnCompletion {
  private readonly transaction: ChatTransaction
  private readonly session: Session

  constructor(transaction: ChatTransaction, session: Session) {
    this.transaction = transaction
    this.session = session
  }

  async finish(
    turn: StoredTurn,
    end: TurnEnd,
    occurredAt = this.transaction.now,
  ): Promise<void> {
    const noStopRequest = await firstStopRequester(this.transaction, turn).then(
      (requester) => requester === undefined,
      () => false,
    )
    turn.started ??= turn.state === 'running' || turn.state === 'stopping'
    if (turn.loginFailure) {
      const retryMessageId = turn.messageIds[0]
      const error = { code: 'agent_login_required', message: turn.loginFailure }
      await this.transaction.emit({
        type: 'turn.failed',
        sessionId: this.session.id,
        turnId: turn.id,
        error,
        retryMessageId,
        durationMs: Math.max(
          0,
          this.transaction.now - (turn.startedAt ?? this.transaction.now),
        ),
      })
      end = { state: 'failed', retryMessageId, error }
      delete turn.loginFailure
    }
    if (end.state === 'finished' && !turn.closeAfterStop)
      await continueUnanswered(this.transaction, turn, end.randomId)
    const following = turn.nextTurnId ?? null
    turn.state = end.state
    if (end.state === 'failed') turn.error = end.error
    turn.nextTurnId = null
    await this.removeCommands(turn.id)
    await this.transaction.capabilityNotes.release(turn.sessionId, turn.id)
    await this.transaction.saveTurn(turn)
    await this.transaction.queueFixes.end(
      turn,
      end.state,
      occurredAt,
      this.transaction.now,
    )
    await readySessionWatches(this.transaction, turn)
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
    this.transaction.endedTurns.push({
      turnId: turn.id,
      occurredAt,
      ...(noStopRequest ? { stateWithoutStop: end.state } : {}),
    })
  }

  async stopped(turn: StoredTurn, keepQueued?: () => string): Promise<void> {
    const continuation =
      keepQueued && !turn.closeAfterStop
        ? await continueUnanswered(this.transaction, turn, keepQueued, 'queued')
        : undefined
    if (!turn.loginFailure)
      await this.transaction.emit({
        type: 'turn.completed',
        sessionId: this.session.id,
        turnId: turn.id,
        state: 'stopped',
        durationMs: 0,
        files: [],
        omittedFileCount: 0,
        userMessageIds: continuation
          ? turn.messageIds.filter(
              (id) => !continuation.messageIds.includes(id),
            )
          : turn.messageIds,
      })
    await this.finish(turn, { state: 'stopped' })
  }

  private async cancelWaiting(turnId: string | null): Promise<void> {
    while (turnId) {
      const waiting = await this.transaction.turn(turnId)
      if (!waiting) return
      turnId = waiting.nextTurnId ?? null
      if (waiting.state === 'queued') await this.stopped(waiting)
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

  async saveSession(): Promise<void> {
    await this.transaction.saveSession(this.session)
    await this.transaction.emit({
      type: 'session.updated',
      session: this.session,
    })
  }
}
