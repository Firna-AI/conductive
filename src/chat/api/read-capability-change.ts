import type { CapabilityChange } from '../../ui/components/chat/capabilityChangeCopy'
import type { CapabilityChangeNote } from '../../shared/capability-change'
import { list, oneOf, record, text } from './json'
import { readMember } from './read-continued'

const readKind = oneOf<CapabilityChange['kind']>({
  'pre-approved': true,
  'pre-approval-removed': true,
  'session-approval-removed': true,
  'value-given': true,
  'value-removed': true,
})

/** One change of the secrets that a session can use with no request. */
function readChange(value: unknown): CapabilityChange {
  const source = record(value, 'change')
  const kind = readKind(source.kind)
  return { kind, names: list(text)(source.names) }
}

/**
 * The note of a change of the capabilities of the workspace in one session,
 * with the member who made the change. A change of a kind that this app
 * does not know makes the whole note unreadable. So the chat skips the
 * note, as an older tab does, and never shows a part of what the agent got.
 */
export function readCapabilityChangeNote(
  source: Record<string, unknown>,
): CapabilityChangeNote {
  return {
    type: 'capabilities.changed',
    sessionId: text(source.sessionId),
    noteId: text(source.noteId),
    member: readMember(source.member),
    changes: [...list(readChange)(source.changes)],
  }
}
