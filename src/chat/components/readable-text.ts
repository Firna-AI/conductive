import { tokens } from '../links/chat-tokens'
import type { TextBlock } from './agent-text'

/**
 * The reading of chat text that finds the bold marks and the code of an
 * answer, and no link or mention.
 */
const plainReading = { marks: true, links: false, mentions: () => false }

/**
 * Whether the chat shows readable text of `text`, the text of a paragraph,
 * a heading, or a table cell of an answer. It shows none when no text or
 * code token holds a character other than white space, as for `**` or a
 * lone backtick. A count of the tokens is not enough: a lone backtick
 * starts code that runs to the end of the text, so it gives one empty code
 * token. The check reads only code and bold, so it needs no file tree and
 * no workspace list, and the result depends on the text alone. So a link
 * or a mention counts as the text that the agent wrote.
 */
export function showsText(text: string): boolean {
  return tokens(text, plainReading).some(
    (token) =>
      (token.kind === 'text' || token.kind === 'code') &&
      token.text.trim() !== '',
  )
}

/**
 * Whether a message line shows readable text for a block of an answer: a
 * character other than white space. A paragraph and a heading show their
 * text as `showsText` reads it. A code block shows its text as the agent
 * wrote it, so `**` in code counts. The line writes the number of each item
 * of a numbered list as text. A bullet is no text, so a bulleted list counts
 * by the blocks of its items, at each depth. The line shows a table as its
 * cells, with a dot between two cells, so a table of two cells shows text.
 */
export function blockShowsText(block: TextBlock): boolean {
  switch (block.kind) {
    case 'p':
    case 'heading':
      return showsText(block.text)
    case 'code':
      return block.text.trim() !== ''
    case 'ol':
      return block.items.length > 0
    case 'ul':
      return block.items.some((item) => item.some(blockShowsText))
    case 'table': {
      const cells = [block.head, ...block.rows].flat()
      return cells.length > 1 || cells.some(showsText)
    }
  }
}
