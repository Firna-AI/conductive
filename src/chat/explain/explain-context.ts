import { createContext } from 'react'
import type { MenuPoint } from '../ui/Menu'
import type { Explanation } from './explanations'
import type { ExplainSelection } from './selection'

/**
 * What the messages of the chat of the shown session tab need from
 * Explain: their marks, the selection with Explain by it, and the actions
 * of both. Only that chat gives it, so the popover shows no Explain and no
 * marks of its own.
 */
export interface ExplainView {
  /** The ID that the messages of this chat carry, as `messageAttributes` says. */
  chat: string
  /** The explanations of the shown session, by the message of each quote. */
  marks: ReadonlyMap<string, readonly Explanation[]>
  /** The selection that Explain can explain now, if any. */
  selection: ExplainSelection | null
  /**
   * Explain floats by the selection: on a computer, in a workspace that
   * takes messages. A phone shows it above the composer.
   */
  floating: boolean
  /** A press on Explain waits for its reply. */
  starting: boolean
  /** The explanation whose popover is open, if any. */
  open: string | null
  explain: () => void
  openPopover: (explanationId: string) => void
  openMenu: (explanationIds: readonly string[], at: MenuPoint) => void
  /** Notes the state button of a mark, which takes the focus back. */
  noteGlyph: (explanationId: string, element: HTMLElement | null) => void
  /** Notes the box of the open mark, which the popover keeps to. */
  noteAnchor: (element: HTMLElement | null) => void
}

export const ExplainContext = createContext<ExplainView | null>(null)
