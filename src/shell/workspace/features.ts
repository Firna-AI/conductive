import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { WorkspaceStream } from '../../app/events'
import type { ChatController } from '../../chat/state/controller'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import type { Workspace } from '../../shared/workspaces'
import type { SubscribeWorkspaceEvents } from '../../terminal/tool-parts/workspace'
import type { Viewport } from '../ui/viewport'
import { appFeatures } from './app-features'

/** The cloud computer of the open workspace, as the panels show it. */
export type SandboxState =
  'ready' | 'starting' | 'stopped' | 'error' | 'archived'

/**
 * The kept chat as the owner of the saved workspace view: the open tabs,
 * the active tab, the list, and the tool. The chat loads the view, and
 * `updateView` saves each change through its one writer.
 */
export type SavedView = Pick<
  ChatController,
  'subscribe' | 'getSnapshot' | 'updateView'
>

/** What a feature of the workspace gets from the shell. */
export interface WorkspaceContext {
  org: OrgSummary
  workspace: Workspace
  /** The person signed in. */
  viewer: User
  sandbox: SandboxState
  /** The app refuses to start the sandbox, as while its owner is suspended. */
  startRefused?: boolean
  viewport: Viewport
  /** The address after the workspace, such as `['files']` or `['terminal']`. */
  view: readonly string[]
  /** The ordered events of the workspace: each event once, in order. */
  stream: WorkspaceStream
  /** The saved view of the workspace, which a feature reads and changes. */
  savedView: SavedView
  /**
   * The events that the tools read: the updates of the workspace and the
   * revokes of its previews, the stored revokes first.
   */
  toolEvents: SubscribeWorkspaceEvents
  /** Opens the Archive question, or `null` when the viewer may not archive. */
  archive: (() => void) | null
  /**
   * Takes the workspace of the API's answer after the owner picker assigns
   * another owner, so the header and the start state follow at once.
   */
  onReassigned: (workspace: Workspace) => void
}

export type WorkspaceSlot = (context: WorkspaceContext) => ReactNode

/**
 * The parts that later milestones put into the shell of a workspace. The
 * shell draws the frame, the header, the start steps, and the sandbox
 * states, and the chat of the workspace fills the centre. A missing part
 * leaves its place empty. A host that gives `tabs`, `transcript`, or
 * `composer` gets the shell's own chat column with those parts in place of
 * the chat.
 */
export interface WorkspaceFeatures {
  /** The tabs above the shell's own chat column, in place of the chat. */
  tabs?: WorkspaceSlot
  /** The history of the shell's own chat column. The start steps follow it. */
  transcript?: WorkspaceSlot
  /** The composer of the shell's own chat column while the sandbox runs or starts. */
  composer?: WorkspaceSlot
  /**
   * A part in place of the whole chat, or `null` for the chat. Without it,
   * the chat keeps its tabs and shows the file or diff tab of the address
   * in place of the chat of its session.
   */
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

/** The parts that the host gives. They take the place of the app's own. */
export const FeaturesContext = createContext<WorkspaceFeatures>({})

/** The parts of the workspace: the app's own, under those of the host. */
export function useFeatures(): WorkspaceFeatures {
  const host = useContext(FeaturesContext)
  return useMemo(() => ({ ...appFeatures, ...host }), [host])
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
