import type { MdBlock, MdListItem } from './markdown-document'
import { previewBreaks } from './preview-inline'

/**
 * A task box as typed: `[ ]`, `[x]`, or `[X]`, then a space, a tab, or the
 * end of a line.
 */
const taskBox = /^\[([ xX])\](?=[ \t\n]|$)/u

/**
 * A list item with its task box. The parser reads no task box, so the file
 * preview reads one at the start of the first paragraph of an item, as
 * GitHub does. `content` is the source text of that paragraph, or
 * undefined when the item starts with another block. The box shows as a
 * check box, and it leaves the text with the space after it. The chat
 * keeps a task box as text, as "Lists" of `chat-markdown.md` says.
 */
export function taskItem(
  content: string | undefined,
  blocks: MdBlock[],
): MdListItem {
  const box = content === undefined ? null : taskBox.exec(content)
  const [first, ...rest] = blocks
  if (box === null || first?.kind !== 'paragraph') {
    return { checked: null, blocks }
  }
  const [lead, ...after] = first.text
  // A reference link, such as `[x]`, can take the box from the text.
  if (lead?.kind !== 'text' || !lead.text.startsWith(box[0])) {
    return { checked: null, blocks }
  }
  const typed = lead.text.slice(box[0].length).replace(/^[ \t\n]/u, '')
  const text = previewBreaks(
    typed === '' ? after : [{ kind: 'text', text: typed }, ...after],
  )
  const kept: MdBlock[] = text.length > 0 ? [{ kind: 'paragraph', text }] : []
  return { checked: box[1] !== ' ', blocks: [...kept, ...rest] }
}
