import type { AgentChoice } from './agents'
import { orgPath, type Timestamp } from './api'
import type { GitHubSummary } from './github'
import type { MessageSender, SendMessageRequest, UserMessage } from './messages'

export const WORKSPACE_RESTORE_MS = 14 * 24 * 60 * 60 * 1_000

export function workspaceRestoreUntil(
  archivedAt: number | null,
  sandboxId: string | null,
): number | null {
  return archivedAt !== null && sandboxId !== null
    ? archivedAt + WORKSPACE_RESTORE_MS
    : null
}

export function workspacesPath(orgId: string): string {
  return `${orgPath(orgId)}/workspaces`
}
export function workspacePath(orgId: string, workspaceId: string): string {
  return `${workspacesPath(orgId)}/${encodeURIComponent(workspaceId)}`
}
export const workspacePaths = {
  resume: (orgId: string, id: string) => `${workspacePath(orgId, id)}/resume`,
  activity: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/activity`,
  read: (orgId: string, id: string) => `${workspacePath(orgId, id)}/read`,
  archive: (orgId: string, id: string) => `${workspacePath(orgId, id)}/archive`,
  continue: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/continue`,
  continueResult: (orgId: string, id: string, continueId: string) =>
    `${workspacePath(orgId, id)}/continue/${encodeURIComponent(continueId)}`,
  restore: (orgId: string, id: string) => `${workspacePath(orgId, id)}/restore`,
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
  number: number
  link: string
  orgId: string
  repositoryId: string
  sectionId: string
  owner: MessageSender
  name: string | null
  branch: string
  choice: AgentChoice
  state: WorkspaceState
  github: GitHubSummary | null
  createdAt: Timestamp
  updatedAt: Timestamp
  archivedAt: Timestamp | null
  restoreUntil: Timestamp | null
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
export interface OrderedWorkspaceResponse extends WorkspaceResponse {
  /** The workspace event sequence when this read or resume reply was made. */
  eventNumber: number
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
export interface LocalWork {
  uncommittedFiles: readonly string[]
  unpushedCommits: number
}

export interface ContinueWorkspaceRequest {
  expectedBranch: string
  allowLocalWork?: boolean
}

export type ContinueWorkspaceResponse =
  | { state: 'pending'; continueId: string }
  | {
      state: 'confirmation-required'
      branch: string
      baseBranch: string
      localWork: LocalWork
    }
  | { state: 'continued'; workspace: Workspace; eventNumber: number }
