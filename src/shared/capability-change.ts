import {
  capabilityChangeWords,
  type CapabilityChange,
} from '../ui/components/chat/capabilityChangeCopy'
import type { MessageSender } from './generated/MessageSender'
import { inlineCode, plainText } from './transcript/markdown-code'

export type CapabilityChangeNote = {
  type: 'capabilities.changed'
  sessionId: string
  noteId: string
  member: MessageSender
  changes: CapabilityChange[]
}

export function capabilityChangeNoteWords(
  member: MessageSender,
  changes: readonly CapabilityChange[],
  viewerId: string | null = null,
) {
  return capabilityChangeWords(
    member.id === viewerId ? 'You' : (member.displayName ?? member.githubLogin),
    changes,
  )
}

export function capabilityChangeText(
  member: MessageSender,
  changes: readonly CapabilityChange[],
  markdown = false,
): string {
  return capabilityChangeNoteWords(member, changes)
    .map((piece) =>
      typeof piece === 'string'
        ? markdown
          ? plainText(piece)
          : piece
        : inlineCode(piece.name),
    )
    .join('')
}
