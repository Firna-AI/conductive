import { createContext } from 'react'
import type { MenuPoint } from '../ui/Menu'
import type { KeptQuote } from './ask-state'
import type { Explanation } from './explanations'
import type { ExplainSelection } from './selection'

/**
 * The start that waits for its reply: of a press on Explain, or of the Send
 * of an Ask. While one waits, neither starts a second explanation.
 */
export type StartWait = 'explain' | 'ask' | null

/**
 * What the messages of the chat of the shown session tab need from
 * Explain: their marks, the selection with Explain and Ask by it, the quote
 * of an unsent Ask, and the actions of each. Only that chat gives it, so
 * the popover shows no Explain, no Ask, and no marks of its own.
 */
export interface ExplainView {
  /** The ID that the messages of this chat carry, as `messageAttributes` says. */
  chat: string
  /** The explanations of the shown session, by the message of each quote. */
  marks: ReadonlyMap<string, readonly Explanation[]>
  /** The selection that Explain and Ask can take now, if any. */
  selection: ExplainSelection | null
  /**
   * Explain and Ask float by the selection: on a computer, in a workspace
   * that takes messages. A phone shows them above the composer.
   */
  floating: boolean
  starting: StartWait
  /** The explanation whose popover is open, if any. */
  open: string | null
  /** The quote of the unsent Ask whose popover shows, if any. */
  kept: KeptQuote | null
  explain: () => void
  /** Opens the unsent popover of an Ask about the selection. */
  ask: () => void
  openPopover: (explanationId: string) => void
  openMenu: (explanationIds: readonly string[], at: MenuPoint) => void
  /** Notes the state button of a mark, which takes the focus back. */
  noteGlyph: (explanationId: string, element: HTMLElement | null) => void
  /** Notes the box of the open mark or kept quote, which the popover keeps to. */
  noteAnchor: (element: HTMLElement | null) => void
}

export const ExplainContext = createContext<ExplainView | null>(null)
