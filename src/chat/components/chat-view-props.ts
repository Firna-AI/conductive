import type { Workspace } from '../../shared/generated/Workspace'
import type { ReactNode } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import type { WorkspaceView } from '../../shared/workspace-view'
import type { PaneSplit } from '../../app/pane-split'
import type { ChatMentions } from '../mentions/MentionsContext'
import type { CopyServices } from '../transcript-copy'
import type { Clock } from '../ui/clock'
import type { ComposerFocus } from './Composer'
import type { ChatHost } from './sandbox-parts'
import type { RenderTab } from './tab-row'

/** How the chat shows, and what it tells the app. */
export interface ChatViewProps {
  /** The phone layout takes 40 px touch targets and sheets for menus. */
  viewport: 'desktop' | 'mobile'
  /** The time source for durations and relative times. */
  clock?: Clock
  /**
   * The clipboard, the clock, and the timers of a copy of a transcript, such
   * as the services of the app. Keep it stable: it keeps the text of a copy
   * that the clipboard refused, as `copyTranscript` says. Without it, the
   * chat copies through the clipboard of the browser.
   */
  copy?: CopyServices
  /**
   * Names and draws a file or diff tab of the saved view at its place in the
   * tab row, as `RenderTab` says. Without it, the row shows only the session
   * tabs, as on a phone.
   */
  renderTab?: RenderTab
  /**
   * The page that each pane shows in place of the chat of a session, such
   * as an open file, by the index of the pane in the saved view. A missing
   * or null page shows the chat. The tabs and the overlays stay, and the
   * row of the pane marks its shown file or diff tab. A phone shows none.
   */
  pages?: readonly ReactNode[]
  /**
   * The share of the left pane of a split, which the divider moves, such as
   * the one of the panel layout of the app. Without it, the chat keeps a
   * share of its own while it shows.
   */
  paneSplit?: PaneSplit
  /** The workspace record, its state, and the title from its first message. */
  onWorkspaceChange?: (workspace: Workspace) => void
  /** The open tabs, as the chat saves them through the view route. */
  onViewChange?: (view: WorkspaceView) => void
  /** A file chip of a finished turn opens its diff. */
  onOpenDiff?: (path: string) => void
  /**
   * A plain click on a workspace chip in a message or an answer opens the
   * page of its link, such as through the navigation of the app. Without
   * it, a chip is a plain link that the browser opens.
   */
  onOpenPage?: (to: string) => void
  /** The notice of an agent with no login leads to its Connect form. */
  onConnectAgent?: (agent: Agent) => void
  /**
   * The files of the workspace that the composer lists after `@`, and what
   * a press on a file chip opens, as `ChatMentions` says. Without it, the
   * composer has no list, and a message shows each mention as text.
   */
  mentions?: ChatMentions
  /** The start steps and the sandbox bar that the app draws, as `ChatHost` says. */
  host?: ChatHost
  /**
   * The app shows the workspace read-only, such as while its org is
   * suspended. The chat then shows its history, changes its tabs in the
   * browser only, and sends no write. An archived workspace is read-only
   * without it.
   */
  readOnly?: boolean
  /**
   * The composer takes the focus when it shows, as after a click on the
   * workspace in the sidebar. `ComposerFocus` gives the rules. With two
   * panes, the composer of the leading chat takes it.
   */
  composerFocus?: ComposerFocus | null
}
