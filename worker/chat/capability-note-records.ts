import type { CapabilityChangeNote } from '../../src/shared/capability-change'
import { capabilityChangeText } from '../../src/shared/capability-change'
import type { RunnerNoticeLine } from '../../src/shared/generated/RunnerNoticeLine'
import { warnWorker } from '../warnings'
import { identifier, number, record, string, strings } from './inputs'
import { chatKey } from './storage-keys'
import type { ChatData } from './types'

export interface CapabilityNote extends Omit<
  CapabilityChangeNote,
  'type' | 'noteId'
> {
  id: string
  createdAt: number
  sentTurnId: string | null
}

function readNote(value: unknown): CapabilityNote {
  const note = record(value)
  const member = record(note.member)
  if (!Array.isArray(note.changes))
    throw new Error('Invalid capability changes.')
  const changes: CapabilityChangeNote['changes'] = note.changes.map(
    (value: unknown) => {
      const change = record(value)
      if (change.kind === 'mac-access' && typeof change.on === 'boolean')
        return { kind: change.kind, on: change.on }
      if (
        change.kind === 'pre-approved' ||
        change.kind === 'pre-approval-removed' ||
        change.kind === 'session-approval-removed' ||
        change.kind === 'value-given' ||
        change.kind === 'value-removed'
      )
        return { kind: change.kind, names: strings(change.names) }
      throw new Error('Invalid capability change.')
    },
  )
  return {
    id: identifier(note.id),
    sessionId: identifier(note.sessionId),
    createdAt: number(note.createdAt),
    sentTurnId: note.sentTurnId === null ? null : identifier(note.sentTurnId),
    member: {
      id: identifier(member.id),
      githubLogin: string(member.githubLogin),
      displayName:
        member.displayName === null ? null : string(member.displayName),
      avatarUrl: member.avatarUrl === null ? null : string(member.avatarUrl),
    },
    changes,
  }
}

export class CapabilityNoteRecords {
  private readonly data: ChatData
  constructor(data: ChatData) {
    this.data = data
  }

  async eligible(sessionId: string): Promise<boolean> {
    return (
      (await this.data.get(chatKey('capabilities-prepared', sessionId))) ===
      true
    )
  }

  prepared(sessionId: string): Promise<void> {
    return this.data.put(chatKey('capabilities-prepared', sessionId), true)
  }

  async waiting(sessionId: string): Promise<CapabilityNote[]> {
    const key = chatKey('capability-notes', sessionId)
    const count = (await this.data.get<number>(key)) ?? 0
    if (!count) return []
    const parts: string[] = []
    for (let part = 0; part < count; part++)
      parts.push(string(await this.data.get(`${key}:${part}`)))
    const value: unknown = JSON.parse(parts.join(''))
    if (!Array.isArray(value)) throw new Error('Invalid capability notes.')
    return value.map(readNote)
  }

  private async save(sessionId: string, notes: readonly CapabilityNote[]) {
    const key = chatKey('capability-notes', sessionId)
    const old = (await this.data.get<number>(key)) ?? 0
    const text = notes.length ? JSON.stringify(notes) : ''
    const parts = Math.ceil(text.length / 16_000)
    for (let part = 0; part < parts; part++)
      await this.data.put(
        `${key}:${part}`,
        text.slice(part * 16_000, (part + 1) * 16_000),
      )
    for (let part = parts; part < old; part++)
      await this.data.delete(`${key}:${part}`)
    if (parts) await this.data.put(key, parts)
    else await this.data.delete(key)
  }

  async add(note: CapabilityNote) {
    const notes = [...(await this.waiting(note.sessionId)), note]
    if (notes.length > 50) {
      notes.splice(0, notes.length - 50)
      warnWorker({ kind: 'capability_notes_limited' })
    }
    await this.save(note.sessionId, notes)
  }

  async take(
    sessionId: string,
    turnId: string,
    includeUnsent = true,
  ): Promise<RunnerNoticeLine[]> {
    const notes = await this.waiting(sessionId)
    const taken = notes.filter(
      (note) =>
        (includeUnsent && note.sentTurnId === null) ||
        note.sentTurnId === turnId,
    )
    for (const note of taken) note.sentTurnId = turnId
    if (taken.length) await this.save(sessionId, notes)
    return taken.map((note) => ({
      id: note.id,
      text: capabilityChangeText(note.member, note.changes),
    }))
  }

  async acknowledge(sessionId: string, turnId: string, ids: readonly string[]) {
    const notes = await this.waiting(sessionId)
    const remaining = notes.filter(
      (note) => note.sentTurnId !== turnId || !ids.includes(note.id),
    )
    if (remaining.length !== notes.length) await this.save(sessionId, remaining)
  }

  async release(sessionId: string, turnId: string) {
    const notes = await this.waiting(sessionId)
    let changed = false
    for (const note of notes) {
      if (note.sentTurnId !== turnId) continue
      note.sentTurnId = null
      changed = true
    }
    if (changed) await this.save(sessionId, notes)
  }
}
