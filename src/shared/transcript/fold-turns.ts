import type { AgentChatEvent } from '../generated/AgentChatEvent'
import type { KnownTurn } from './known-turns'

type WorkingTurn = { id: string; ended: boolean; messageIds: string[] }

/** Turn ranks never change during a fold. The first turn to take a message owns it. */
export class FoldTurns {
  readonly values: WorkingTurn[]
  readonly active = new Set<string>()
  private readonly ranks = new Map<string, number>()
  private readonly owners = new Map<string, string>()
  private readonly messages = new Map<string, Set<string>>()

  constructor(turns: readonly KnownTurn[]) {
    this.values = turns.map((turn, index) => {
      this.ranks.set(turn.id, index)
      this.messages.set(turn.id, new Set(turn.messageIds))
      if (!turn.ended) this.active.add(turn.id)
      for (const id of turn.messageIds) {
        if (!this.owners.has(id)) this.owners.set(id, turn.id)
      }
      return { ...turn, messageIds: [...turn.messageIds] }
    })
  }

  rank(id: string): number {
    return this.ranks.get(id) ?? -1
  }

  owner(messageId: string): string | null {
    return this.owners.get(messageId) ?? null
  }

  get(id: string): WorkingTurn | undefined {
    const rank = this.ranks.get(id)
    return rank === undefined ? undefined : this.values[rank]
  }

  add(id: string): void {
    if (this.ranks.has(id)) return
    this.ranks.set(id, this.values.length)
    this.values.push({ id, ended: false, messageIds: [] })
    this.messages.set(id, new Set())
    this.active.add(id)
  }

  take(turnId: string, messageId: string): boolean {
    const turn = this.get(turnId)
    const messages = this.messages.get(turnId)
    if (!turn || !messages || messages.has(messageId)) return false
    turn.messageIds.push(messageId)
    messages.add(messageId)
    const owner = this.owners.get(messageId)
    if (owner !== undefined && this.rank(owner) < this.rank(turnId))
      return false
    this.owners.set(messageId, turnId)
    return true
  }

  note(event: AgentChatEvent): void {
    this.add(event.turnId)
    if (event.type === 'turn.completed' || event.type === 'turn.failed') {
      this.end(event.turnId)
    }
  }

  end(turnId: string): void {
    const turn = this.get(turnId)
    if (turn) turn.ended = true
    this.active.delete(turnId)
  }

  ended(turnId: string): boolean {
    const rank = this.rank(turnId)
    return (
      rank >= 0 && (this.values[rank].ended || rank < this.values.length - 1)
    )
  }

  running(turnId: string): boolean {
    const last = this.values.at(-1)
    return last?.id === turnId && !last.ended
  }
}
