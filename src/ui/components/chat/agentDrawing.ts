import type { ComponentType, ReactNode } from 'react'
import type { TextTable } from '../../../chat/markdown/agent-blocks'
import type { InlineText } from '../../../chat/markdown/agent-inline'

/**
 * Where the shared blocks of an agent message draw an inline text. `line`
 * marks the text of a message line, whose closed line shows each line
 * break as a space. `pictures` marks a place where the Markdown image of a
 * picture file can show as its picture: a paragraph or a list item, also
 * in a quote, of an answer or of an open line. A heading and a table cell
 * keep the link of an image, because a picture breaks their layout.
 */
export interface TextPlace {
  line: boolean
  pictures: boolean
}

/**
 * What a view gives `AgentBlocks` and `LineBlocks`: how it draws the inline
 * text of a block and a code block of an answer, and whether a heading
 * shows words where it draws. The app reads chips, links, files, and
 * pictures where the text draws, and the mockups read them from their
 * fixtures. A view keeps one drawing for each message while the message
 * stays the same, so a block of a message that the agent still writes
 * draws again only when its data changes.
 */
export interface AgentDrawing {
  /** Draws the inline text of a block at its place. */
  text: (text: InlineText, place: TextPlace) => ReactNode
  /**
   * Draws a code block of an answer, with its text as the agent wrote it,
   * in the colours of its fence label, or plain when `label` names no
   * language, as `FenceText` of `src/files/code/` draws it.
   */
  code: (text: string, label: string | null) => ReactNode
  /** Draws a table through its registration when it has a stable name. */
  table?: (table: TextTable) => ReactNode
  /**
   * Draws `children` only while `text` shows words where it draws, so a
   * heading that shows no words draws nothing, also no space in a line.
   */
  ShowsWords: ComponentType<{ text: InlineText; children: ReactNode }>
}
