import { createContext, useContext, type ReactNode } from 'react'
import type { WorkspaceStream } from '../../app/events'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import type { Workspace } from '../../shared/workspaces'
import type { Viewport } from '../ui/viewport'

/** The cloud computer of the open workspace, as the panels show it. */
export type SandboxState =
  'ready' | 'starting' | 'stopped' | 'error' | 'archived'

/** What a feature of the workspace gets from the shell. */
export interface WorkspaceContext {
  org: OrgSummary
  workspace: Workspace
  /** The person signed in. */
  viewer: User
  sandbox: SandboxState
  viewport: Viewport
  /** The address after the workspace, such as `['files']` or `['terminal']`. */
  view: readonly string[]
  /** The ordered events of the workspace: each event once, in order. */
  stream: WorkspaceStream
  /** Opens the Archive question, or `null` when the viewer may not archive. */
  archive: (() => void) | null
}

export type WorkspaceSlot = (context: WorkspaceContext) => ReactNode

/**
 * The parts that later milestones put into the shell of a workspace. The
 * shell draws the frame, the header, the start steps, and the sandbox
 * states. A missing part leaves its place empty.
 */
export interface WorkspaceFeatures {
  /** The session and file tabs above the centre column (Milestone 8). */
  tabs?: WorkspaceSlot
  /** The chat history. The start steps follow it (Milestone 8). */
  transcript?: WorkspaceSlot
  /** The composer while the sandbox runs or starts (Milestone 8). */
  composer?: WorkspaceSlot
  /** A file or diff tab in place of the chat, or `null` for the chat (Milestone 10). */
  center?: (context: WorkspaceContext) => ReactNode | null
  /** The pull request bar, or the compact row on a phone (Milestone 14). */
  pullRequest?: WorkspaceSlot
  /** All files, Changes, and Checks (Milestones 10 and 14). */
  files?: WorkspaceSlot
  /** The Terminal, Preview, and Desktop tabs (Milestone 12). */
  tools?: WorkspaceSlot
  /** The owner picker that reassigns the workspace (Milestone 15c). */
  owner?: WorkspaceSlot
}

export const FeaturesContext = createContext<WorkspaceFeatures>({})

export function useFeatures(): WorkspaceFeatures {
  return useContext(FeaturesContext)
}

/** The sandbox state that a workspace state shows in the panels. */
export function sandboxState(workspace: Workspace): SandboxState {
  switch (workspace.state) {
    case 'starting':
    case 'stopped':
    case 'error':
    case 'archived':
      return workspace.state
    case 'working':
    case 'input':
    case 'unread':
    case 'ready':
      return 'ready'
  }
}
