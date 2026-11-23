import type { CapabilityChangeNote } from '../../src/shared/capability-change'
import type { RunnerCapabilities } from '../../src/shared/generated/RunnerCapabilities'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import { randomToken } from '../security/crypto'
import { readSessionCapabilities } from '../secrets/session-capabilities'
import { warnWorker } from '../warnings'
import type { ChatTransaction } from './store'

export type CapabilitySnapshot = ReadonlyMap<string, RunnerCapabilities>
export type CapabilityTouch = {
  change: CapabilityChangeNote['changes'][number]
  sessionId?: string
}

const order = [
  'pre-approved',
  'pre-approval-removed',
  'session-approval-removed',
  'value-given',
  'value-removed',
]

export async function captureCapabilities(
  db: D1Database,
  view: ChatTransaction,
  skip: ReadonlySet<string> = new Set(),
): Promise<CapabilitySnapshot> {
  const facts = new Map<string, RunnerCapabilities>()
  try {
    const sessions = await view.sessions()
    const entries = await Promise.all(
      sessions.map(async (session) => {
        if (
          skip.has(session.id) ||
          !(await view.capabilityNotes.eligible(session.id))
        )
          return null
        const capabilities = await readSessionCapabilities(
          db,
          view.secrets,
          view.workspaceId,
          session.id,
        )
        return capabilities ? { sessionId: session.id, capabilities } : null
      }),
    )
    for (const entry of entries)
      if (entry) facts.set(entry.sessionId, entry.capabilities)
  } catch {
    warnWorker({ kind: 'capability_notes_failed' })
    facts.clear()
  }
  return facts
}

function difference(
  before: RunnerCapabilities,
  after: RunnerCapabilities,
  touches: readonly CapabilityTouch[],
  sessionId: string,
): CapabilityChangeNote['changes'] {
  const changes: CapabilityChangeNote['changes'] = []
  for (const touch of touches) {
    if (touch.sessionId && touch.sessionId !== sessionId) continue
    const change = touch.change
    const added =
      change.kind === 'pre-approved' || change.kind === 'value-given'
    const names = change.names.filter((name) =>
      added
        ? !before.secrets.includes(name) && after.secrets.includes(name)
        : before.secrets.includes(name) && !after.secrets.includes(name),
    )
    const existing = changes.find((entry) => entry.kind === change.kind)
    if (existing) {
      changes.splice(changes.indexOf(existing), 1, {
        ...existing,
        names: [...new Set([...existing.names, ...names])].sort(),
      })
    } else if (names.length)
      changes.push({ kind: change.kind, names: [...new Set(names)].sort() })
  }
  return changes.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

export async function recordCapabilityChanges(
  db: D1Database,
  view: ChatTransaction,
  before: CapabilitySnapshot,
  touches: readonly CapabilityTouch[],
  member: MessageSender,
  skip: ReadonlySet<string> = new Set(),
): Promise<void> {
  const entries = await Promise.all(
    [...before]
      .filter(([sessionId]) => !skip.has(sessionId))
      .map(async ([sessionId, previous]) => ({
        sessionId,
        previous,
        current: await readSessionCapabilities(
          db,
          view.secrets,
          view.workspaceId,
          sessionId,
        ),
      })),
  )
  for (const { sessionId, previous, current } of entries) {
    if (!current) continue
    const changes = difference(previous, current, touches, sessionId)
    if (!changes.length) continue
    const id = randomToken()
    await view.emit({
      type: 'capabilities.changed',
      sessionId,
      noteId: id,
      member,
      changes,
    })
  }
}
