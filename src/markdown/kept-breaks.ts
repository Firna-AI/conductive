/**
 * The line breaks that a block of Markdown draws, as "Line breaks" of
 * `chat-markdown.md` says, for the inline nodes of each view. Agent
 * messages and the file preview share it. This module imports no React.
 */

/**
 * A leaf of inline text in reading order: something that shows, such as
 * text, code, or a link, text of spaces only, or a line break.
 */
export type BreakLeaf = 'shows' | 'blank' | 'break'

/** How the rule reads the inline nodes of one view. */
export interface BreakNodes<Node> {
  /** The nodes inside a mark, such as bold text, or null for a leaf. */
  marked: (node: Node) => readonly Node[] | null
  /** The mark with other nodes inside. */
  remarked: (node: Node, nodes: Node[]) => Node
  /** What a node that is no mark is to the rule. */
  leaf: (node: Node) => BreakLeaf
}

/** The leaves of the nodes in reading order. A mark holds its own leaves. */
function leavesOf<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
  leaves: BreakLeaf[],
): BreakLeaf[] {
  for (const node of nodes) {
    const marked = view.marked(node)
    if (marked) leavesOf(marked, view, leaves)
    else leaves.push(view.leaf(node))
  }
  return leaves
}

/** The nodes with the leaves that `keep` keeps, without empty marks. */
function keptNodes<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
  keep: readonly boolean[],
  at: { leaf: number },
): Node[] {
  const kept: Node[] = []
  for (const node of nodes) {
    const marked = view.marked(node)
    if (marked) {
      const inner = keptNodes(marked, view, keep, at)
      if (inner.length > 0) kept.push(view.remarked(node, inner))
      continue
    }
    if (keep[at.leaf]) kept.push(node)
    at.leaf += 1
  }
  return kept
}

/**
 * The inline nodes of one block with the line breaks that it draws. A
 * break at the start or at the end of the block draws nothing, so a block
 * of only breaks draws nothing and has no nodes. Two or more breaks in a
 * row draw at most one empty line: text of spaces between them does not
 * end the row. Marks count by their text.
 */
export function keptBreaks<Node>(
  nodes: readonly Node[],
  view: BreakNodes<Node>,
): Node[] {
  const leaves = leavesOf(nodes, view, [])
  const first = leaves.indexOf('shows')
  if (first < 0) return []
  const last = leaves.lastIndexOf('shows')
  if (first === 0 && last === leaves.length - 1 && !leaves.includes('break')) {
    return [...nodes]
  }
  let row = 0
  const keep = leaves.map((leaf, index) => {
    if (index < first || index > last) return false
    if (leaf === 'shows') row = 0
    else if (leaf === 'break') row += 1
    return row <= 2
  })
  return keptNodes(nodes, view, keep, { leaf: 0 })
}
