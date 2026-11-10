import type { User } from '../api'
import {
  turnFilesUnavailable,
  unlistedFiles,
} from '../../../docs/mockups/src/components/chat/lostCopy'
import type { Transcript } from './transcript'

export const turnCopy = {
  failed: 'This turn stopped',
  finished: 'Finished in',
  changedFiles: 'Changed files',
  stillWorking: 'The agent is still working.',
  attachments: 'Attachments',
  source: 'This session started from',
  retry: 'Try again',
  files: 'Files this turn changed',
  working: 'Working',
  thinking: 'Thinking',
} as const

/** The person who reads the chat, and the members whom it can name. */
export interface ChatReaders {
  viewerId: string | null
  members: readonly Pick<User, 'id' | 'githubLogin' | 'displayName'>[]
}

/**
 * The line of a stopped turn: "You" to the member who pressed Stop, and
 * that member's name to the others. An unnamed stop names nobody.
 */
function stoppedLine(by: string | null, readers: ChatReaders): string {
  if (by !== null && by === readers.viewerId) return 'You stopped the agent'
  const member = readers.members.find((item) => item.id === by)
  if (!member) return 'The agent stopped'
  return `${member.displayName ?? member.githubLogin} stopped the agent`
}

/** The newest end of a turn, with the data that its rows do not keep. */
function completionOf(transcript: Transcript, turnId: string) {
  const { turnCompletions } = transcript
  return Object.hasOwn(turnCompletions, turnId)
    ? turnCompletions[turnId]
    : undefined
}

/** The files of an ended turn past the ones that the runner listed. */
export function omittedFiles(transcript: Transcript, turnId: string): number {
  return completionOf(transcript, turnId)?.omittedFileCount ?? 0
}

/** Whether the cloud computer could not read the changed files of a turn. */
export function filesUnread(transcript: Transcript, turnId: string): boolean {
  return completionOf(transcript, turnId)?.filesUnavailable === true
}

/** Whether a turn has a file row, such as one from a late end. */
function hasFileRow(transcript: Transcript, turnId: string): boolean {
  return transcript.items.some(
    (item) => item.kind === 'turn-end' && item.turnId === turnId,
  )
}

/** A stopped turn names unlisted files only when no file row lists them. */
export function stoppedSummary(
  transcript: Transcript,
  turnId: string,
  by: string | null,
  readers: ChatReaders,
): string {
  const files = hasFileRow(transcript, turnId)
    ? 0
    : omittedFiles(transcript, turnId)
  const unread =
    !hasFileRow(transcript, turnId) && filesUnread(transcript, turnId)
  return [
    stoppedLine(by, readers),
    ...(files > 0 ? [unlistedFiles(files)] : []),
    ...(unread ? [turnFilesUnavailable] : []),
  ].join(' · ')
}
