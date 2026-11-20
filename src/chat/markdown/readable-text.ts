import type { TextBlock } from './agent-blocks'
import type { InlineText } from './agent-inline'
import { answerShowsWords, type AnswerReading } from './answer-parts'

/**
 * Whether inline text can show words, from the text alone: a text or a
 * code node with a character other than white space, or a link or an
 * image. The parser leaves out a heading that cannot show words, such as a
 * heading of only white-space code, `` ## ` ` ``. A mark that the parser
 * does not pair, such as one `**`, is text and shows as typed. A link or an
 * image counts, because whether it shows words depends on the tree and the
 * links of the screen, as `answerShowsWords` reads them where the text
 * draws. So this check needs no file tree and no workspace list, and its
 * result depends on the text alone.
 */
export function showsWords(text: InlineText): boolean {
  return text.some((node) => {
    if (node.kind === 'text' || node.kind === 'code') {
      return node.text.trim() !== ''
    }
    if (node.kind === 'mark') return showsWords(node.nodes)
    return node.kind !== 'break'
  })
}

/**
 * Whether a message line shows readable text for a block of an agent
 * message, read with `reading`, as the line draws the block: a character
 * other than white space, or the name of a task box. A paragraph and a
 * heading show the words of their parts, as `answerShowsWords` reads them,
 * so an image with no alt text that opens nothing shows none. A code block
 * shows its text as the agent wrote it, so `**` in code counts. The line
 * writes the number of each item of a numbered list, and names the box of
 * each task item, so such an item counts. A bullet is no text, so a
 * bulleted list counts by the blocks of its items, at each depth, and a
 * quote counts by its blocks. A rule shows no words. The line shows a
 * table as its cells, with a dot between two cells, so a table of two
 * cells shows text.
 */
export function blockShowsText(
  block: TextBlock,
  reading: AnswerReading,
): boolean {
  const shows = (inner: TextBlock) => blockShowsText(inner, reading)
  switch (block.kind) {
    case 'p':
    case 'heading':
      return answerShowsWords(block.text, reading)
    case 'code':
      return block.text.trim() !== ''
    case 'ol':
      return block.items.length > 0
    case 'ul':
      return block.items.some(
        (item) => item.checked !== null || item.blocks.some(shows),
      )
    case 'quote':
      return block.blocks.some(shows)
    case 'rule':
      return false
    case 'table': {
      const cells = [block.head, ...block.rows].flat()
      return (
        cells.length > 1 ||
        cells.some((cell) => answerShowsWords(cell, reading))
      )
    }
  }
}
