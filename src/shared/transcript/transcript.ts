import type { AgentChoice } from '../generated/AgentChoice'
import type { AgentChatEvent } from '../generated/AgentChatEvent'
import type { ToolCall } from '../generated/ToolCall'
import type { ChangedFile } from '../generated/ChangedFile'
import type { MessageSender } from '../generated/MessageSender'
import type { UserMessage } from '../generated/UserMessage'
import type { SessionWatchNotice } from '../generated/SessionWatchNotice'
import type { StopSessionReference } from '../session-stop'
import type { ChatEvent, RunnerEventRefused } from '../chat-events'
import type { KnownTurn } from './known-turns'
import { TranscriptBatch } from './transcript-batch'
import type { CapabilityChangeNote } from '../capability-change'

/** One part of a chat transcript, in the order that the chat shows it. */
export type TranscriptItem =
  | {
      kind: 'capabilities-changed'
      id: string
      member: MessageSender
      changes: CapabilityChangeNote['changes']
    }
  | { kind: 'user'; id: string; message: UserMessage }
  | {
      kind: 'agent'
      id: string
      turnId: string
      text: string
      /**
       * Set when `assistant.completed` gave the whole text of the message.
       * A message that the agent still writes has no mark.
       */
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
      displayBranch?: string
    }
  | {
      /**
       * The line of the app that wakes the session when a turn that it
       * watched ends, at its place in the chat. Its hidden message carries
       * the wake to the agent, so the line belongs to the turn that takes
       * that message, as a message does. It is no message of a member.
       */
      kind: 'wake'
      id: string
      notice: SessionWatchNotice
    }

interface RunningTurn {
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

/** Applies one event with the same private working copy used by batch folds. */
export function foldEvent(
  transcript: Transcript,
  event: ChatEvent,
  occurredAt: number,
  late = false,
): Transcript {
  const batch = new TranscriptBatch(transcript)
  batch.event(event, occurredAt, late)
  return batch.finish().transcript
}
