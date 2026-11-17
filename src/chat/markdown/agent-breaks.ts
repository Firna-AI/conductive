import {
  keptBreaks as keptBreaksOf,
  type BreakNodes,
} from '../../markdown/kept-breaks'
import type { InlineNode } from './agent-inline'

/** How the line-break rule reads the inline tree of an agent message. */
const agentNodes: BreakNodes<InlineNode> = {
  marked: (node) => (node.kind === 'mark' ? node.nodes : null),
  remarked: (node, nodes) => (node.kind === 'mark' ? { ...node, nodes } : node),
  leaf: (node) => {
    if (node.kind === 'break') return 'break'
    return node.kind === 'text' && node.text.trim() === '' ? 'blank' : 'shows'
  },
}

/**
 * The inline text of one block with the line breaks that it draws, as "Line
 * breaks" of `chat-markdown.md` says. A break at the start or at the end of the
 * block draws nothing, so a block of only breaks draws nothing and has no
 * nodes. Two or more breaks in a row draw at most one empty line: text of
 * spaces between them does not end the row. Marks count by their text.
 */
export function keptBreaks(nodes: readonly InlineNode[]): InlineNode[] {
  return keptBreaksOf(nodes, agentNodes)
}
