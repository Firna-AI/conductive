import type { Workspace } from './generated/Workspace'
import type { WorkspaceListRepository } from './generated/WorkspaceListRepository'

import type { UserMessage } from './generated/UserMessage'
import type { WorkspaceStart } from './generated/WorkspaceStart'
import { orgPath } from './api'

import type { SendMessageRequest } from './messages'
import type { WorkspaceCapabilities } from './secrets'
import type { WorkspaceSeed } from './workspace-state-read'

export const WORKSPACE_RESTORE_MS = 14 * 24 * 60 * 60 * 1_000

export function workspaceRemovedAt(
  archivedAt: number | null,
  now: number,
): number | null {
  if (archivedAt === null) return null
  const removedAt = archivedAt + WORKSPACE_RESTORE_MS
  return removedAt <= now ? removedAt : null
}

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
  repository: (orgId: string, id: string) =>
    `${workspacePath(orgId, id)}/repository`,
  repositoryResult: (orgId: string, id: string, changeId: string) =>
    `${workspacePath(orgId, id)}/repository/${encodeURIComponent(changeId)}`,
  restore: (orgId: string, id: string) => `${workspacePath(orgId, id)}/restore`,
  restart: (orgId: string, id: string) => `${workspacePath(orgId, id)}/restart`,
} as const

export interface WorkspaceResponse {
  workspace: Workspace
  start: WorkspaceStart | null
  error: { code: string; message: string; log: string | null } | null
}
export interface OrderedWorkspaceResponse extends WorkspaceResponse {
  /** The workspace event sequence when this read or resume reply was made. */
  eventNumber: number
  seed?: WorkspaceSeed
}
export interface WorkspacesResponse {
  workspaces: readonly Workspace[]
  repositories?: readonly WorkspaceListRepository[]
}
export interface CreateWorkspaceRequest {
  repositoryId: string
  sectionId?: string
  startBranch?: string
  baseBranch?: string
  /**
   * The capabilities of the new workspace. Each field that is not there
   * takes its value from `NEW_WORKSPACE_CAPABILITIES`. The page sends only
   * the pre-approved secrets. The Worker still takes `macAccess`, such as
   * from an older page, and it gates nothing (Mac access decision 7).
   */
  capabilities?: Partial<WorkspaceCapabilities>
  firstMessage: SendMessageRequest
}
export interface CreateWorkspaceResponse extends WorkspaceResponse {
  sessionId: string
  firstMessage: UserMessage
}
export interface LocalWork {
  uncommittedFiles: readonly string[]
  displayUncommittedFiles?: readonly string[]
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
      displayBaseBranch?: string
      localWork: LocalWork
    }
  | { state: 'continued'; workspace: Workspace; eventNumber: number }

/** A repository change moves the workspace to another repository of its org. */
export interface ChangeRepositoryRequest {
  /** The repository and the branch that the caller shows. */
  expectedRepositoryId: string
  expectedBranch: string
  /** The new repository. */
  repositoryId: string
  /** Change repository in the question: go on with the listed work. */
  allowWork?: boolean
}

/** The work of the question before a repository change. */
export interface RepositoryChangeWork {
  /** The local work in the old folder, as Continue counts it. */
  localWork: LocalWork
  /** The open pull request of the old branch. */
  pullRequest: { number: number; url: string } | null
  /** The pushed commits of the old branch that its base branch does not hold. */
  pushedCommits: number
  /** The changed files of the new folder, which move to the new branch. */
  carriedFiles: readonly string[]
  displayCarriedFiles?: readonly string[]
}

export type ChangeRepositoryResponse =
  | { state: 'pending'; changeId: string }
  | {
      state: 'confirmation-required'
      /** The new repository. */
      repository: { id: string; fullName: string }
      /** The old branch, which stays with the old repository. */
      branch: string
      /** The latest default branch of the new repository. */
      baseBranch: string
      work: RepositoryChangeWork
    }
  | { state: 'changed'; workspace: Workspace; eventNumber: number }

/**
 * The reply of Restart: whether the cloud computer downloaded the newest
 * software before the restart. When the check failed, the restart used the
 * installed software.
 */
export interface RestartWorkspaceResponse {
  updateCheck: 'ok' | 'failed'
}
