import type { InlineNode } from './agent-inline'

/**
 * A leaf of inline text in reading order: something that shows, such as
 * text, code, a link, or an image, text of spaces only, or a line break.
 */
type Leaf = 'shows' | 'blank' | 'break'

/** The leaves of the nodes in reading order. A mark holds its own leaves. */
function leavesOf(nodes: readonly InlineNode[], leaves: Leaf[]): Leaf[] {
  for (const node of nodes) {
    if (node.kind === 'mark') leavesOf(node.nodes, leaves)
    else if (node.kind === 'break') leaves.push('break')
    else if (node.kind === 'text' && node.text.trim() === '')
      leaves.push('blank')
    else leaves.push('shows')
  }
  return leaves
}

/** The nodes with the leaves that `keep` keeps, without empty marks. */
function keptNodes(
  nodes: readonly InlineNode[],
  keep: readonly boolean[],
  at: { leaf: number },
): InlineNode[] {
  const kept: InlineNode[] = []
  for (const node of nodes) {
    if (node.kind === 'mark') {
      const inner = keptNodes(node.nodes, keep, at)
      if (inner.length > 0) kept.push({ ...node, nodes: inner })
      continue
    }
    if (keep[at.leaf]) kept.push(node)
    at.leaf += 1
  }
  return kept
}

/**
 * The inline text of one block with the line breaks that it draws, as "Line
 * breaks" of `chat-markdown.md` says. A break at the start or at the end of the
 * block draws nothing, so a block of only breaks draws nothing and has no
 * nodes. Two or more breaks in a row draw at most one empty line: text of
 * spaces between them does not end the row. Marks count by their text.
 */
export function keptBreaks(nodes: readonly InlineNode[]): InlineNode[] {
  const leaves = leavesOf(nodes, [])
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
  return keptNodes(nodes, keep, { leaf: 0 })
}
