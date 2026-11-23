import type { AgentChatEvent } from '../generated/AgentChatEvent'
import type { Session } from '../generated/Session'
import type { ChatEvent } from '../chat-events'
import { FoldItems } from './fold-items'
import { FoldTurns } from './fold-turns'
import {
  continuedKey,
  repositoryChangedKey,
  userKey,
  wakeKey,
} from './item-keys'
import type { TurnItem } from './item-placement'
import { foldLate } from './late-events'
import { foldRefused } from './refused-events'
import type { Transcript } from './transcript'
import { foldTurn } from './turn-events'
import { endShownTurn, foldRecord } from './turn-records'

type Completion = Extract<AgentChatEvent, { type: 'turn.completed' }>

/** One private working copy, shared by single-event and batch callers. */
export class TranscriptBatch {
  private readonly start: Transcript
  private readonly knownTimes: ReadonlyMap<string, number>
  readonly turns: FoldTurns
  readonly items: FoldItems
  readonly stopRequests: Record<string, Transcript['stopRequests'][string]>
  readonly turnCompletions: Record<string, Completion>
  turn: Transcript['turn']
  retryMessageId: string | null
  private times: Map<string, number> | null = null
  private changed = false

  constructor(
    start: Transcript,
    knownTimes: ReadonlyMap<string, number> = new Map(),
  ) {
    this.start = start
    this.knownTimes = knownTimes
    this.turns = new FoldTurns(start.turns)
    this.items = new FoldItems(start.items, this.turns)
    this.turn = start.turn
    this.retryMessageId = start.retryMessageId
    this.stopRequests = { ...start.stopRequests }
    this.turnCompletions = { ...start.turnCompletions }
  }

  place(item: TurnItem, ended: boolean): void {
    this.items.place(item, ended, this.turn?.turnId ?? null)
  }

  completion(event: Completion): void {
    Object.defineProperty(this.turnCompletions, event.turnId, {
      value: event,
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }

  record(session: Session): void {
    const changed = foldRecord(this, session)
    this.changed ||= changed
  }

  event(event: ChatEvent, occurredAt: number, late = false): void {
    this.apply(event, occurredAt, late)
    this.items.added.sort(
      (left, right) =>
        this.items.order.index(left) - this.items.order.index(right),
    )
    for (const node of this.items.added) {
      if ((this.times ?? this.knownTimes).has(node.item.id)) continue
      this.times ??= new Map(this.knownTimes)
      this.times.set(node.item.id, occurredAt)
    }
    this.items.added.length = 0
  }

  private apply(event: ChatEvent, occurredAt: number, late: boolean): void {
    switch (event.type) {
      case 'session.watch-notice':
        this.changed = true
        this.items.put({
          kind: 'wake',
          id: wakeKey(event.watchId),
          notice: event,
        })
        return
      case 'capabilities.changed':
        this.changed = true
        this.items.put({
          kind: 'capabilities-changed',
          id: `capabilities-changed:${event.noteId}`,
          member: event.member,
          changes: event.changes,
        })
        return
      case 'workspace.continued': {
        this.changed = true
        const { displayBranch, displayBaseBranch } = event
        this.items.put({
          kind: 'continued',
          id: continuedKey(event.branch),
          member: event.member,
          branch: event.branch,
          baseBranch: event.baseBranch,
          ...(displayBranch === undefined ? {} : { displayBranch }),
          ...(displayBaseBranch === undefined ? {} : { displayBaseBranch }),
        })
        return
      }
      case 'workspace.repository-changed': {
        const { displayBranch } = event
        this.changed = true
        this.items.put({
          kind: 'repository-changed',
          id: repositoryChangedKey(event.repository.id, event.branch),
          member: event.member,
          repository: event.repository,
          branch: event.branch,
          ...(displayBranch === undefined ? {} : { displayBranch }),
        })
        return
      }
      case 'session.updated':
        return this.record(event.session)
      case 'runner.event-refused':
        if (event.sessionId !== null) {
          this.changed = true
          foldRefused(this, event)
        }
        return
      case 'message.accepted':
        this.changed = true
        this.items.put({
          kind: 'user',
          id: userKey(event.message.id),
          message: event.message,
        })
        return
      case 'message.sent':
        this.changed = true
        this.items.markSent([event.messageId])
        this.take(event.turnId, event.messageId)
        return
      case 'turn.stop-requested':
        if (!Object.hasOwn(this.stopRequests, event.turnId)) {
          this.changed = true
          Object.defineProperty(this.stopRequests, event.turnId, {
            value: event.requestedBySession ?? event.requestedById,
            enumerable: true,
            writable: true,
            configurable: true,
          })
        }
        return
      default: {
        if (late) {
          if (this.turns.running(event.turnId)) {
            this.changed = true
            endShownTurn(this, event.turnId)
          }
          this.changed ||= event.type !== 'turn.thinking'
          return foldLate(this, event)
        }
        if (this.turns.ended(event.turnId)) {
          this.changed ||= event.type !== 'turn.thinking'
          return foldLate(this, event)
        }
        this.changed = true
        const known = this.turns.get(event.turnId)
        this.turns.note(event)
        if (!known) this.items.noteTurn(event.turnId)
        if (event.type === 'turn.started') {
          for (const id of event.messageIds) this.take(event.turnId, id)
        }
        foldTurn(this, event, occurredAt)
      }
    }
  }

  private take(turnId: string, messageId: string): void {
    if (this.turns.take(turnId, messageId)) this.items.take(messageId)
  }

  finish(): { transcript: Transcript; times: ReadonlyMap<string, number> } {
    if (!this.changed) return { transcript: this.start, times: this.knownTimes }
    return {
      transcript: {
        items: this.items.order.items(),
        turns: this.turns.values,
        turn: this.turn,
        retryMessageId: this.retryMessageId,
        stopRequests: this.stopRequests,
        turnCompletions: this.turnCompletions,
      },
      times: this.times ?? this.knownTimes,
    }
  }
}
