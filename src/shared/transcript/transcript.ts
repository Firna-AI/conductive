import type { AgentChoice } from '../generated/AgentChoice'
import type { AgentChatEvent } from '../generated/AgentChatEvent'
import type { ToolCall } from '../generated/ToolCall'
import type { ChangedFile } from '../generated/ChangedFile'
import type { MessageSender } from '../generated/MessageSender'
import type { UserMessage } from '../generated/UserMessage'
import type { StopSessionReference } from '../session-stop'
import type { ChatEvent, RunnerEventRefused } from '../chat-events'
import { continuedKey, repositoryChangedKey, userKey } from './item-keys'
import { hasEnded, noteTurn, takeMessage, type KnownTurn } from './known-turns'
import { foldLate } from './late-events'
import { foldRefused } from './refused-events'
import { foldTurn, markSent, replaceAt } from './turn-events'
import { foldMarkedLate, foldRecord } from './turn-records'

/** One part of a chat transcript, in the order that the chat shows it. */
export type TranscriptItem =
  | { kind: 'user'; id: string; message: UserMessage }
  | {
      kind: 'agent'
      id: string
      turnId: string
      text: string
      /** Set when `assistant.completed` gave the whole text of the message. */
      complete?: true
    }
  | { kind: 'tool'; id: string; turnId: string; tool: ToolCall }
  | {
      kind: 'turn-end'
      id: string
      turnId: string
      durationMs: number
      files: readonly ChangedFile[]
    }
  | {
      kind: 'stopped'
      id: string
      turnId: string
      /** The member who pressed Stop, or null for another stop source. */
      by: string | null
      from?: StopSessionReference
    }
  | {
      kind: 'failed'
      id: string
      turnId: string
      error: { code: string; message: string }
      retryMessageId: string
    }
  | {
      /** A runner event that the workspace refused, at its place in the chat. */
      kind: 'lost'
      id: string
      marker: RunnerEventRefused
    }
  | {
      /**
       * The note of Continue, at its place in the chat: the member who
       * pressed it, the new branch, and its base. It belongs to no turn.
       * The branches keep their real names, and the optional labels, which
       * hide each secret value, are the names that the chat and its copy
       * show.
       */
      kind: 'continued'
      id: string
      member: MessageSender
      branch: string
      baseBranch: string
      displayBranch?: string
      displayBaseBranch?: string
    }
  | {
      /**
       * The note of a repository change, at its place in the chat: the
       * member who changed it, the new repository, and the new branch. It
       * belongs to no turn.
       */
      kind: 'repository-changed'
      id: string
      member: MessageSender
      repository: { id: string; fullName: string }
      branch: string
    }

export interface RunningTurn {
  turnId: string
  startedAt: number
  choice: AgentChoice | null
  /** The agent thinks and has written nothing since its last step. */
  thinking: boolean
}

export interface Transcript {
  items: readonly TranscriptItem[]
  turn: RunningTurn | null
  /**
   * The turns that accepted events named, in the order of their first event,
   * and whether each one ended. The last one is the newest turn.
   */
  turns: readonly KnownTurn[]
  /**
   * The message that Try again may send again, as the newest record of the
   * session names it, or null. Only the failed item of that message offers
   * Try again. Each record sets it at its place in the event order.
   */
  retryMessageId: string | null
  /** Complete terminal data, including omitted files, without new rendering. */
  turnCompletions: Readonly<
    Record<string, Extract<AgentChatEvent, { type: 'turn.completed' }>>
  >
  /**
   * The first member or session that requested Stop, for each active turn. The
   * request alone ends nothing: the turn runs until it ends as stopped.
   */
  stopRequests: Readonly<Record<string, string | StopSessionReference>>
}

export const emptyTranscript: Transcript = {
  items: [],
  turn: null,
  turns: [],
  retryMessageId: null,
  turnCompletions: {},
  stopRequests: {},
}

/** The transcript with a note at the end, or in the place of its repeat. */
function withNote(transcript: Transcript, item: TranscriptItem): Transcript {
  const index = transcript.items.findIndex((entry) => entry.id === item.id)
  const items =
    index < 0
      ? [...transcript.items, item]
      : replaceAt(transcript.items, index, item)
  return { ...transcript, items }
}

/**
 * Applies the note of Continue at its place in the event order. Each new
 * branch has one note in a session, so a repeat of the note replaces it.
 * The real branch keys the note, because a label can change between two
 * reads of the same note, and two branches can have the same label.
 */
function foldContinued(
  transcript: Transcript,
  event: Extract<ChatEvent, { type: 'workspace.continued' }>,
): Transcript {
  const { displayBranch, displayBaseBranch } = event
  return withNote(transcript, {
    kind: 'continued',
    id: continuedKey(event.branch),
    member: event.member,
    branch: event.branch,
    baseBranch: event.baseBranch,
    ...(displayBranch === undefined ? {} : { displayBranch }),
    ...(displayBaseBranch === undefined ? {} : { displayBaseBranch }),
  })
}

/**
 * Applies the note of a repository change at its place in the event order.
 * Each new branch of a repository has one note in a session, so a repeat of
 * the note replaces it.
 */
function foldRepositoryChanged(
  transcript: Transcript,
  event: Extract<ChatEvent, { type: 'workspace.repository-changed' }>,
): Transcript {
  return withNote(transcript, {
    kind: 'repository-changed',
    id: repositoryChangedKey(event.repository.id, event.branch),
    member: event.member,
    repository: event.repository,
    branch: event.branch,
  })
}

/**
 * Applies one chat event of a session to its transcript. The chat shows only
 * the messages that people sent. A message ID that no accepted message has,
 * such as one that the agent SDK added, shows nothing. A session record ends
 * and starts turns, as `foldRecord` says. An agent event that the workspace
 * marked `late` belongs to a turn that has ended, as `foldMarkedLate` says.
 */
export function foldEvent(
  transcript: Transcript,
  event: ChatEvent,
  occurredAt: number,
  late = false,
): Transcript {
  switch (event.type) {
    case 'workspace.continued':
      return foldContinued(transcript, event)
    case 'workspace.repository-changed':
      return foldRepositoryChanged(transcript, event)
    case 'session.updated':
      return foldRecord(transcript, event.session)
    case 'runner.event-refused':
      if (event.sessionId === null) return transcript
      return foldRefused(transcript, event)
    case 'message.accepted': {
      const item: TranscriptItem = {
        kind: 'user',
        id: userKey(event.message.id),
        message: event.message,
      }
      const index = transcript.items.findIndex((entry) => entry.id === item.id)
      const items =
        index < 0
          ? [...transcript.items, item]
          : replaceAt(transcript.items, index, item)
      return { ...transcript, items }
    }
    case 'message.sent':
      return {
        ...transcript,
        items: markSent(transcript.items, [event.messageId]),
        turns: takeMessage(transcript.turns, event.turnId, event.messageId),
      }
    case 'turn.stop-requested':
      if (Object.hasOwn(transcript.stopRequests, event.turnId)) {
        return transcript
      }
      return {
        ...transcript,
        stopRequests: {
          ...transcript.stopRequests,
          [event.turnId]: event.requestedBySession ?? event.requestedById,
        },
      }
    default:
      if (late) return foldMarkedLate(transcript, event)
      if (hasEnded(transcript, event.turnId)) return foldLate(transcript, event)
      return foldTurn(
        { ...transcript, turns: noteTurn(transcript.turns, event) },
        event,
        occurredAt,
      )
  }
}
