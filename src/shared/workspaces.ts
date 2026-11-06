import type { AgentChoice } from './agents'
import { orgPath, type Timestamp } from './api'
import type { MessageSender, SendMessageRequest, UserMessage } from './messages'

export function workspacesPath(orgId: string): string {
  return `${orgPath(orgId)}/workspaces`
}
export function workspacePath(orgId: string, workspaceId: string): string {
  return `${workspacesPath(orgId)}/${encodeURIComponent(workspaceId)}`
}
export const workspacePaths = {
  open: (orgId: string, id: string) => `${workspacePath(orgId, id)}/open`,
  resume: (orgId: string, id: string) => `${workspacePath(orgId, id)}/resume`,
  activity: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/activity`,
  read: (orgId: string, id: string) => `${workspacePath(orgId, id)}/read`,
  archiveCheck: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/archive-check`,
  archive: (orgId: string, id: string) => `${workspacePath(orgId, id)}/archive`,
} as const

/** `input`: the agent waits for the user, such as for a command approval. */
export type WorkspaceState =
  | 'working'
  | 'input'
  | 'unread'
  | 'ready'
  | 'starting'
  | 'stopped'
  | 'error'
  | 'archived'

export interface Workspace {
  id: string
  orgId: string
  repositoryId: string
  sectionId: string
  owner: MessageSender
  name: string
  branch: string
  choice: AgentChoice
  state: WorkspaceState
  createdAt: Timestamp
  updatedAt: Timestamp
  archivedAt: Timestamp | null
}

export interface StartStep {
  id: string
  label: string
  state: 'running' | 'completed' | 'failed'
  startedAt: Timestamp
  completedAt: Timestamp | null
}

export interface WorkspaceStart {
  kind: 'create' | 'resume'
  startedAt: Timestamp
  steps: readonly StartStep[]
}

export interface WorkspaceResponse {
  workspace: Workspace
  start: WorkspaceStart | null
  error: { code: string; message: string; log: string | null } | null
}
export interface WorkspacesResponse {
  workspaces: readonly Workspace[]
}
export interface CreateWorkspaceRequest {
  repositoryId: string
  sectionId?: string
  firstMessage: SendMessageRequest
}
export interface CreateWorkspaceResponse extends WorkspaceResponse {
  sessionId: string
  firstMessage: UserMessage
}
export interface UpdateWorkspaceRequest {
  name?: string
  sectionId?: string
  position?: number
}
export interface ArchiveCheckResponse {
  uncommittedFiles: readonly string[]
  unpushedCommits: number
}
export interface ArchiveWorkspaceRequest {
  /** Explicit confirmation when the archive check found work. */
  discardUnpushedWork: boolean
}
export interface WorkspaceActivityRequest {
  source: 'input' | 'terminal' | 'preview'
}
export interface MarkWorkspaceReadRequest {
  throughEventNumber: number
}
