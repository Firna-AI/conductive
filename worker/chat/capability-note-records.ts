import type { CapabilityChangeNote } from '../../src/shared/capability-change'
import { capabilityChangeText } from '../../src/shared/capability-change'
import type { RunnerNoticeLine } from '../../src/shared/generated/RunnerNoticeLine'
import { ChatRecords } from './chat-records'
import { sessionHasDispatch } from './capability-start-evidence'
import { readCapabilityHistory } from './history-session-records'
import { identifier, number, record, strings } from './inputs'
import { chatKey } from './storage-keys'

export interface CapabilityNote extends Omit<
  CapabilityChangeNote,
  'type' | 'noteId'
> {
  id: string
  createdAt: number
  sentTurnId: string | null
}

interface CapabilityDelivery {
  readThrough: number
  readIds: string[]
  inFlight: { turnId: string; noteIds: string[] } | null
}

export class CapabilityNoteRecords extends ChatRecords {
  eligible(sessionId: string): Promise<boolean> {
    return sessionHasDispatch(this, sessionId)
  }

  private async read(sessionId: string): Promise<CapabilityDelivery> {
    const value = await this.data.get<unknown>(
      chatKey('capability-delivery', sessionId),
    )
    if (value === undefined)
      return { readThrough: 0, readIds: [], inFlight: null }
    const saved = record(value)
    const batch = saved.inFlight === null ? null : record(saved.inFlight)
    return {
      readThrough: number(saved.readThrough),
      readIds: strings(saved.readIds),
      inFlight: batch
        ? { turnId: identifier(batch.turnId), noteIds: strings(batch.noteIds) }
        : null,
    }
  }

  private save(sessionId: string, progress: CapabilityDelivery) {
    return this.data.put(chatKey('capability-delivery', sessionId), progress)
  }

  private async activeBatch(sessionId: string, progress: CapabilityDelivery) {
    const batch = progress.inFlight
    if (!batch) return null
    const session = await this.session(sessionId)
    if (session?.activeTurnId !== batch.turnId) return null
    const turn = await this.turn(batch.turnId)
    return turn?.sessionId === sessionId &&
      (turn.state === 'queued' ||
        turn.state === 'running' ||
        turn.state === 'stopping')
      ? batch
      : null
  }

  async waiting(sessionId: string): Promise<CapabilityNote[]> {
    const progress = await this.read(sessionId)
    const batch = await this.activeBatch(sessionId, progress)
    const read = new Set(progress.readIds)
    const sent = new Set(batch?.noteIds)
    return (
      await readCapabilityHistory(this.data, sessionId, progress.readThrough)
    )
      .filter(({ event }) => !read.has(event.noteId))
      .map(({ event, occurredAt }) => ({
        id: event.noteId,
        sessionId: event.sessionId,
        member: event.member,
        changes: event.changes,
        createdAt: occurredAt,
        sentTurnId: sent.has(event.noteId) ? (batch?.turnId ?? null) : null,
      }))
  }

  async take(
    sessionId: string,
    turnId: string,
    includeUnsent = true,
  ): Promise<RunnerNoticeLine[]> {
    const taken = (await this.waiting(sessionId)).filter(
      (note) =>
        (includeUnsent && note.sentTurnId === null) ||
        note.sentTurnId === turnId,
    )
    if (taken.length) {
      const progress = await this.read(sessionId)
      progress.inFlight = { turnId, noteIds: taken.map((note) => note.id) }
      await this.save(sessionId, progress)
    }
    return taken.map((note) => ({
      id: note.id,
      text: capabilityChangeText(note.member, note.changes),
    }))
  }

  async acknowledge(sessionId: string, turnId: string, ids: readonly string[]) {
    const progress = await this.read(sessionId)
    const batch = await this.activeBatch(sessionId, progress)
    if (batch?.turnId !== turnId) return
    const received = new Set(ids.filter((id) => batch.noteIds.includes(id)))
    if (!received.size) return
    const read = new Set([...progress.readIds, ...received])
    for (const { eventNumber, event } of await readCapabilityHistory(
      this.data,
      sessionId,
      progress.readThrough,
    )) {
      if (!read.delete(event.noteId)) break
      progress.readThrough = eventNumber
    }
    progress.readIds = [...read]
    const remaining = batch.noteIds.filter((id) => !received.has(id))
    progress.inFlight = remaining.length ? { turnId, noteIds: remaining } : null
    await this.save(sessionId, progress)
  }

  async release(sessionId: string, turnId: string) {
    const progress = await this.read(sessionId)
    if (progress.inFlight?.turnId !== turnId) return
    progress.inFlight = null
    await this.save(sessionId, progress)
  }
}
