import type { TextBlock } from './agent-blocks'
import type { InlineText } from './agent-inline'

/**
 * Whether inline text shows words: a text or a code node with a character
 * other than white space, or a link or an image, which shows its words, its
 * address, or its file when the text draws. So a heading of only
 * white-space code, such as `` ## ` ` ``, shows no words. A mark that the
 * parser does not pair, such as one `**`, is text and shows as typed. The
 * check reads the inline tree alone, so it needs no file tree and no
 * workspace list, and its result depends on the text alone.
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
 * message: a character other than white space, or the name of a task box.
 * A paragraph and a heading show their words, as `showsWords` reads them.
 * A code block shows its text as the agent wrote it, so `**` in code
 * counts. The line writes the number of each item of a numbered list, and
 * names the box of each task item, so such an item counts. A bullet is no
 * text, so a bulleted list counts by the blocks of its items, at each
 * depth, and a quote counts by its blocks. A rule shows no words. The line
 * shows a table as its cells, with a dot between two cells, so a table of
 * two cells shows text.
 */
export function blockShowsText(block: TextBlock): boolean {
  switch (block.kind) {
    case 'p':
    case 'heading':
      return showsWords(block.text)
    case 'code':
      return block.text.trim() !== ''
    case 'ol':
      return block.items.length > 0
    case 'ul':
      return block.items.some(
        (item) => item.checked !== null || item.blocks.some(blockShowsText),
      )
    case 'quote':
      return block.blocks.some(blockShowsText)
    case 'rule':
      return false
    case 'table': {
      const cells = [block.head, ...block.rows].flat()
      return cells.length > 1 || cells.some(showsWords)
    }
  }
}
