import type {
  InlineNode,
  InlineText,
} from '../../../../../src/chat/markdown/agent-inline'
import type { AgentDrawing } from '../../../../../src/ui/components/chat/agentDrawing'
import { fixtureDrawing } from '../chat/fixtureDrawing'
import type { MessageMarks } from './chatMarks'
import { MarkedText } from './MarkedText'

/**
 * The words that an inline text shows, in which a mark finds its quote:
 * the text of its text, its code, its marks, its links, and the alt text of
 * its images, with a line break for a break.
 */
function wordsOf(text: InlineText): string {
  return text.map(wordsOfNode).join('')
}

function wordsOfNode(node: InlineNode): string {
  switch (node.kind) {
    case 'text':
    case 'code':
      return node.text
    case 'break':
      return '\n'
    case 'mark':
      return wordsOf(node.nodes)
    case 'link':
      return wordsOf(node.label)
    case 'image':
      return wordsOf(node.alt)
  }
}

/**
 * The part of a node from the character `from` of its words to the
 * character `to`. A break and an image stay whole.
 */
function cutNode(node: InlineNode, from: number, to: number): InlineNode {
  switch (node.kind) {
    case 'text':
    case 'code':
      return { ...node, text: node.text.slice(from, to) }
    case 'mark':
      return { ...node, nodes: cutText(node.nodes, from, to) }
    case 'link':
      return { ...node, label: cutText(node.label, from, to) }
    case 'break':
    case 'image':
      return node
  }
}

/**
 * The part of an inline text from the character `from` of its words to the
 * character `to`, with its code, marks, and links cut at both ends.
 */
function cutText(text: InlineText, from: number, to: number): InlineText {
  const nodes: InlineNode[] = []
  let at = 0
  for (const node of text) {
    const length = wordsOfNode(node).length
    const start = Math.max(from - at, 0)
    const end = Math.min(to - at, length)
    if (start < end) {
      nodes.push(
        start === 0 && end === length ? node : cutNode(node, start, end),
      )
    }
    at += length
  }
  return nodes
}

/**
 * How an answer with marks draws its text: each text, such as a paragraph
 * or a list item, as `fixtureDrawing` draws it, with the marks and the
 * selection of the message over it, as `MarkedText` draws them. A mark
 * finds its quote in the words of one text.
 */
export function markedDrawing(marks: MessageMarks): AgentDrawing {
  return {
    ...fixtureDrawing,
    text: (text, place) => (
      <MarkedText
        marks={marks}
        render={(_, from, to) =>
          fixtureDrawing.text(cutText(text, from, to), place)
        }
        text={wordsOf(text)}
      />
    ),
  }
}
