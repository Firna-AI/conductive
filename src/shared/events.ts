import type { Timestamp } from './api'
import type { ChatEvent } from './chat-events'
import type { FileEvent } from './files'
import type { GitHubBanner, GitHubChecksResponse } from './github'
import {
  workspacePath,
  type Workspace,
  type WorkspaceResponse,
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
): string {
  const query = new URLSearchParams({
    sessionId,
    after: String(afterEventNumber),
  })
  return `${workspacePath(orgId, workspaceId)}/history?${query}`
}

export type WorkspaceEvent =
  | ChatEvent
  | FileEvent
  | {
      type: 'workspace.updated'
      workspace: Workspace
      error?: Pick<
        NonNullable<WorkspaceResponse['error']>,
        'code' | 'message'
      > | null
    }
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
}

/** Store history before subscribing to live events after throughEventNumber. */
export interface ChatHistoryResponse {
  events: readonly WorkspaceEventEnvelope[]
  throughEventNumber: number
}

export type WorkspaceSocketMessage =
  | { type: 'history'; history: ChatHistoryResponse }
  | { type: 'event'; envelope: WorkspaceEventEnvelope }

export interface WorkspaceSocketRequest {
  afterEventNumber: number
}
