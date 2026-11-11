import type {
  ChatHistoryResponse as PublicHistory,
  NewestChatHistoryResponse as PublicNewestHistory,
  WorkspaceEvent as PublicEvent,
  WorkspaceEventEnvelope as PublicEnvelope,
  WorkspaceSocketMessage as PublicMessage,
} from '../../src/shared/events'
import {
  presentWorkspace,
  type WorkspaceLinkContext,
  type WorkspaceSnapshot,
} from '../data/workspace-link'

type WorkspaceUpdate = Extract<PublicEvent, { type: 'workspace.updated' }>
export type WorkspaceEvent =
  | Exclude<PublicEvent, WorkspaceUpdate>
  | (Omit<WorkspaceUpdate, 'workspace'> & { workspace: WorkspaceSnapshot })

export interface WorkspaceEventEnvelope extends Omit<PublicEnvelope, 'event'> {
  event: WorkspaceEvent
}

type SavedHistory<Page> = Page extends unknown
  ? Omit<Page, 'events'> & { events: readonly WorkspaceEventEnvelope[] }
  : never

export type ChatHistoryResponse = SavedHistory<PublicHistory>
export type NewestChatHistoryResponse = SavedHistory<PublicNewestHistory>

export type WorkspaceSocketMessage =
  | { type: 'history'; history: ChatHistoryResponse }
  | { type: 'event'; envelope: WorkspaceEventEnvelope }

export interface WorkspaceEventPeer {
  send(message: WorkspaceSocketMessage): void
  close(): void
}

function presentWorkspaceEnvelope(
  envelope: WorkspaceEventEnvelope,
  context: WorkspaceLinkContext,
): PublicEnvelope {
  const event = envelope.event
  return event.type === 'workspace.updated'
    ? {
        ...envelope,
        event: {
          ...event,
          workspace: presentWorkspace(event.workspace, context),
        },
      }
    : { ...envelope, event }
}

export function presentWorkspaceHistory(
  history: ChatHistoryResponse,
  context: WorkspaceLinkContext,
): PublicHistory
export function presentWorkspaceHistory(
  history: NewestChatHistoryResponse,
  context: WorkspaceLinkContext,
): PublicNewestHistory
export function presentWorkspaceHistory(
  history: ChatHistoryResponse | NewestChatHistoryResponse,
  context: WorkspaceLinkContext,
): PublicHistory | PublicNewestHistory {
  return {
    ...history,
    events: history.events.map((envelope) =>
      presentWorkspaceEnvelope(envelope, context),
    ),
  }
}

export function presentWorkspaceMessage(
  message: WorkspaceSocketMessage,
  context: WorkspaceLinkContext,
): PublicMessage {
  return message.type === 'history'
    ? {
        type: 'history',
        history: presentWorkspaceHistory(message.history, context),
      }
    : {
        type: 'event',
        envelope: presentWorkspaceEnvelope(message.envelope, context),
      }
}
