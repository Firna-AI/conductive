/**
 * The task box of a list item, such as `- [ ]` and `- [x]`, as the chat and
 * the file preview read it, from item 14 B of the Markdown parser plan. The
 * parser reads no task box, so both adapters read it here. This module
 * imports no React.
 */

/**
 * A task box as typed: `[ ]`, `[x]`, or `[X]`, then a space, a tab, or the
 * end of a line.
 */
const taskBox = /^\[([ xX])\](?=[ \t\n]|$)/u

/** A text node, as the inline content of each view holds one. */
interface TextNode {
  kind: 'text'
  text: string
}

/** A list item of a view: the state of its task box, and its blocks. */
export interface ListItem<Block> {
  /** A task item is done or not done. Null for an item with no task box. */
  checked: boolean | null
  blocks: readonly Block[]
}

/** The box of a task item, and the inline content after it. */
interface TaskRead<Node> {
  /** Done for `[x]` and `[X]`, and not done for `[ ]`. */
  checked: boolean
  /** The inline content without the box and the space after it. */
  nodes: (Node | TextNode)[]
}

/** Whether a node of either view is text. */
function isText(node: { kind: string } | undefined): node is TextNode {
  return (
    node?.kind === 'text' && 'text' in node && typeof node.text === 'string'
  )
}

/**
 * The task box at the start of the first paragraph of a list item, as
 * GitHub reads it. `content` is the source text of that paragraph, so a box
 * counts only as typed, and not after an escape or as an entity. `nodes` is
 * the inline content that a view read from that paragraph. A reference
 * link, such as `[x]`, can take the box from the text, so the box counts
 * only when that content starts with its text too. Null for a paragraph
 * with no task box. Each view then draws the line breaks of the content
 * that is left, as its paragraphs do.
 */
export function readTaskBox<Node extends { kind: string }>(
  content: string,
  nodes: readonly Node[],
): TaskRead<Node> | null {
  const box = taskBox.exec(content)
  const [lead, ...after] = nodes
  if (box === null || !isText(lead) || !lead.text.startsWith(box[0])) {
    return null
  }
  const typed = lead.text.slice(box[0].length).replace(/^[ \t\n]/u, '')
  return {
    checked: box[1] !== ' ',
    nodes: typed === '' ? after : [{ kind: 'text', text: typed }, ...after],
  }
}
