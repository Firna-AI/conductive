import type { ChatSnapshot } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import type { SendingView } from '../state/linked-replies'
import type { MenuPoint } from '../ui/Menu'
import type { UnsentAsk } from './ask-state'
import type { ExplainView } from './explain-context'
import type { Explanation } from './explanations'

/** The popover that lies open over the chat of its parent session. */
export interface OpenPopover {
  explanationId: string
  /**
   * The session whose chat the popover shows: the explanation, or a linked
   * session that a follow-up of the popover opened.
   */
  sessionId: string
  /**
   * The follow-up field takes the focus as the popover opens, because the
   * popover takes the place of an unsent popover whose field had it.
   */
  focusField: boolean
}

/** The menu of the explanations whose marks overlap at a press. */
export interface OpenMarkMenu {
  ids: readonly string[]
  at: MenuPoint
}

export interface ExplainProps {
  snapshot: ChatSnapshot
  controller: ChatController
  /** The shown session, whose chat holds the marks. */
  sessionId: string | null
  readOnly: boolean
  mobile: boolean
}

/** The state of Explain in the chat of the shown session tab. */
export interface ExplainState {
  view: ExplainView | null
  explanations: readonly Explanation[]
  popover: OpenPopover | null
  /** The unsent Ask whose popover shows, if any. */
  unsent: UnsentAsk | null
  /** The box of the open mark or of the kept quote, which the popover keeps to. */
  anchor: HTMLElement | null
  menu: OpenMarkMenu | null
  openPopover: (explanationId: string) => void
  /**
   * The popover of an explanation as the view that sends a follow-up or Try
   * again, as `SendingView` says. It shows a session only while it lies
   * open on that explanation, so a late reply leaves the popover of another
   * explanation as it is.
   */
  popoverView: (explanationId: string) => SendingView
  closePopover: (focusMark: boolean) => void
  closeMenu: () => void
  /** The text of the field of the unsent popover changed. */
  changeQuestion: (text: string) => void
  /**
   * Sends the question. When the explanation starts, its popover opens
   * while the parent session shows, as `useAsk` says.
   */
  sendQuestion: () => void
  /** Closes the unsent popover, as `closedAsk` says. */
  closeAsk: () => void
}
