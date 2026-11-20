import {
  keptBreaks,
  showsText,
  type BreakLeaf,
  type BreakNodes,
} from '../../markdown/kept-breaks'
import type { InlineNode } from './agent-inline'
import type { AnswerPart } from './answer-parts'

/**
 * The line breaks of agent text, by the rule of `src/markdown/kept-breaks.ts`.
 * The chat applies the rule once to each block, to the parts that it
 * draws, because only those parts say what a link shows.
 */

/** What a leaf of agent text is to the rule: a line break, spaces, or text. */
function leafOf(node: InlineNode | AnswerPart): BreakLeaf {
  if (node.kind === 'break') return 'break'
  return node.kind === 'text' && node.text.trim() === '' ? 'blank' : 'shows'
}

/**
 * How the rule reads the inline tree of the parser: a mark holds nodes,
 * and a link or an image counts as text, because each one shows something
 * in the chat, such as its label, its address, or its Markdown as typed.
 */
const parsedNodes: BreakNodes<InlineNode> = {
  inner: (node) => (node.kind === 'mark' ? node.nodes : null),
  rebuilt: (node, nodes) => (node.kind === 'mark' ? { ...node, nodes } : node),
  leaf: leafOf,
}

/**
 * Whether the inline text of a block shows something. A block of only line
 * breaks, or of breaks and spaces, shows nothing, so it is no block.
 */
export function showsInline(nodes: readonly InlineNode[]): boolean {
  return showsText(nodes, parsedNodes)
}

/**
 * How the rule reads the parts that the chat draws: a mark holds parts, a
 * web link its words, and a link to a file its label. A chip and code are
 * text. A mark that keeps no part leaves its block. A link always shows
 * its words or its address, so it keeps its place.
 */
const drawnParts: BreakNodes<AnswerPart> = {
  inner: (part) => {
    if (part.kind === 'mark') return part.parts
    if (part.kind === 'link') return part.words
    return part.kind === 'file-link' ? part.label : null
  },
  rebuilt: (part, inner) => {
    switch (part.kind) {
      case 'mark':
        return inner.length > 0 ? { ...part, parts: inner } : null
      case 'link':
        return { ...part, words: inner }
      case 'file-link':
        return { ...part, label: inner }
      default:
        return part
    }
  },
  leaf: leafOf,
}

/**
 * The parts of one block with the line breaks that the block draws, as
 * "Line breaks" of `chat-markdown.md` says. The rule reads the words of a
 * link, the label of a link to a file, and the brackets of a link that
 * opens nothing as text of the block. A break at the start or at the end
 * of the block draws nothing, and two or more breaks in a row draw at most
 * one empty line.
 */
export function answerBreaks(parts: readonly AnswerPart[]): AnswerPart[] {
  return keptBreaks(parts, drawnParts)
}
