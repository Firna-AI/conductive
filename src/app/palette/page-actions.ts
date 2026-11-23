import type { Workspace } from '../../shared/generated/Workspace'
import type { User } from '../../shared/api'

import { mayArchive, type OrgAccess } from '../permissions'
import type { OfferedActionId } from './commands'

/** An action that a part of the page offers, and what running it does. */
export interface OfferedAction {
  readonly id: OfferedActionId
  /**
   * The address that the action opens, so that its row is a link. A plain
   * click and Enter run `run`, as the control of the page does.
   */
  readonly href?: string
  /**
   * The label of the row when it names a fact of the page, such as the
   * target branch of Merge latest. Without it, the row takes the label of
   * `actionTexts`.
   */
  readonly label?: string
  readonly run: () => void
}

/** Where the actions of an offer go in the palette. */
type OfferScope =
  /** The actions of the open workspace, under its name. */
  | {
      readonly kind: 'workspace'
      readonly workspaceId: string
      readonly name: string
    }
  /** The actions of the workspace list of an org. */
  | { readonly kind: 'org'; readonly orgId: string }
  /** The actions of the window, such as the sidebar toggle, in every host. */
  | { readonly kind: 'window' }

/**
 * What a part of the page offers to the palette while it shows. So the
 * palette offers only what the page offers to the person.
 */
export interface PaletteOffer {
  readonly scope: OfferScope
  readonly actions: readonly OfferedAction[]
}

/** What the workspace screen shows, which decides its actions. */
export interface WorkspacePage {
  access: OrgAccess
  workspace: Workspace
  viewer: Pick<User, 'id'>
  /** The page shows the tabs of the right column, as on desktop. */
  rightColumn: boolean
  /** The page shows the chat with its session tabs. */
  chat: boolean
  /** The page offers the Desktop tool, which the app can hide. */
  desktopTool: boolean
  /** The archived bar of the page offers Restore. */
  offersRestore: boolean
  /**
   * The page can send the prompt of Merge latest: it knows the target
   * branch, and the member may push, as for an agent action of the bar.
   */
  mergeLatest: boolean
  /**
   * The action of the merge queue that the menu of the workspace offers:
   * Add to merge queue, Remove from queue, or none.
   */
  queue?: 'add' | 'remove' | null
}

/**
 * The actions that the screen of an open workspace offers. New terminal
 * comes from the Terminal tool, which offers it while its + takes a press.
 */
export type WorkspaceActionId = Exclude<
  OfferedActionId,
  'new-section' | 'hide-sidebar' | 'show-sidebar' | 'new-terminal'
>

const goToActions: readonly WorkspaceActionId[] = [
  'go-to-all-files',
  'go-to-changes',
  'go-to-checks',
  'go-to-terminal',
  'go-to-preview',
  'go-to-desktop',
]

/**
 * Whether the page offers the Go to rows: it shows the tabs of the right
 * column, which an archived workspace does not show. New terminal shows
 * only there too.
 */
export function showsGoToRows(
  page: Pick<WorkspacePage, 'rightColumn' | 'workspace'>,
): boolean {
  return page.rightColumn && page.workspace.state !== 'archived'
}

/**
 * The actions that the workspace screen offers to the person, in their
 * order. A read-only workspace, archived or in a suspended org, offers no
 * New session. Session history stays, because it changes nothing. The Go
 * to rows follow `showsGoToRows`. Go to Desktop also needs the Desktop
 * tool. Merge latest needs a workspace that takes changes and a page that
 * can send its prompt. No control of the page offers it (merge latest
 * decision 2 A). Add to merge queue and Remove from queue follow the menu
 * of the workspace, as `queue` says (decision 317). Archive follows
 * `mayArchive`. Restore workspace follows the archived bar of the chat,
 * which offers it to every member until its last day.
 */
export function workspaceActionIds(page: WorkspacePage): WorkspaceActionId[] {
  const { access, workspace } = page
  const archived = workspace.state === 'archived'
  const readOnly = access.suspended || archived
  const ids: WorkspaceActionId[] = []
  if (page.chat && !readOnly) ids.push('new-session')
  if (page.chat) ids.push('session-history')
  if (showsGoToRows(page)) {
    ids.push(
      ...goToActions.filter((id) => id !== 'go-to-desktop' || page.desktopTool),
    )
  }
  if (page.mergeLatest && !readOnly) ids.push('merge-latest')
  if (page.queue === 'add' && !readOnly) ids.push('add-to-merge-queue')
  if (page.queue === 'remove' && !readOnly) ids.push('remove-from-merge-queue')
  if (mayArchive(access, workspace, page.viewer)) ids.push('archive-workspace')
  if (page.chat && page.offersRestore) ids.push('restore-workspace')
  return ids
}
