import type { Timestamp } from './api'
import type { ChatEvent } from './chat-events'
import type { FileEvent } from './files'
import type { GitHubBanner, GitHubChecksResponse } from './github'
import {
  workspacePath,
  type Workspace,
  type WorkspaceStart,
} from './workspaces'

export function workspaceEventsPath(
  orgId: string,
  workspaceId: string,
  afterEventNumber = 0,
): string {
  return `${workspacePath(orgId, workspaceId)}/events?after=${afterEventNumber}`
}
export function chatHistoryPath(
  orgId: string,
  workspaceId: string,
  sessionId: string,
  afterEventNumber = 0,
  throughEventNumber?: number,
): string {
  const query = new URLSearchParams({
    sessionId,
    after: String(afterEventNumber),
  })
  if (throughEventNumber !== undefined)
    query.set('through', String(throughEventNumber))
  return `${workspacePath(orgId, workspaceId)}/history?${query}`
}

export type WorkspaceEvent =
  | ChatEvent
  | FileEvent
  | { type: 'workspace.updated'; workspace: Workspace }
  | { type: 'workspace.title'; name: string }
  | { type: 'start.updated'; start: WorkspaceStart }
  | {
      type: 'github.updated'
      banner: GitHubBanner
      checks: GitHubChecksResponse
    }
  | { type: 'preview.revoked'; previewId: string }

/** The workspace assigns contiguous event numbers, starting at 1. */
export interface WorkspaceEventEnvelope {
  workspaceId: string
  eventNumber: number
  occurredAt: Timestamp
  event: WorkspaceEvent
  /** Only the workspace marks an agent event whose turn already ended. */
  late?: true
}

interface ChatHistoryPage {
  events: readonly WorkspaceEventEnvelope[]
  /** All pages together hold the state through this fixed snapshot number. */
  throughEventNumber: number
}

export type ChatHistoryResponse = ChatHistoryPage &
  (
    | { hasMore: true; nextAfterEventNumber: number }
    | { hasMore?: never; nextAfterEventNumber?: never }
  )

export type WorkspaceSocketMessage =
  | { type: 'history'; history: ChatHistoryResponse }
  | { type: 'event'; envelope: WorkspaceEventEnvelope }

export interface WorkspaceSocketRequest {
  afterEventNumber: number
}
