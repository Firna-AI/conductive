import { markdownParser } from '../../markdown/parser'
import { labelHidesAddress } from '../../markdown/web-links'
import type { InlineNode } from './agent-inline'
import type { AnswerPart } from './answer-parts'
import { addPart } from './answer-text'

// The labels of the links and the images of agent text, as `answerParts`
// reads them: the text that a label shows, its parts, and the words of a
// web link.

/**
 * The text that nodes show, as the chat tests a label (chat-links.md). A
 * line break is no character, so a label that shows an address on two
 * lines holds that address, as it does on one line.
 */
export function shownText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'text' || node.kind === 'code') return node.text
      if (node.kind === 'break') return ''
      if (node.kind === 'mark') return shownText(node.nodes)
      return shownText(node.kind === 'link' ? node.label : node.alt)
    })
    .join('')
}

/**
 * The parts of the label of a link or of the alt text of an image: text,
 * code, line breaks, and marks. No chip and no link sits in a label, and
 * an image in it shows its alt text.
 */
export function labelParts(nodes: readonly InlineNode[]): AnswerPart[] {
  const parts: AnswerPart[] = []
  for (const node of nodes) {
    if (node.kind === 'text') addPart(parts, { kind: 'text', text: node.text })
    else if (node.kind === 'code') parts.push({ kind: 'code', text: node.text })
    else if (node.kind === 'break') parts.push({ kind: 'break' })
    else if (node.kind === 'mark') {
      parts.push({
        kind: 'mark',
        mark: node.mark,
        parts: labelParts(node.nodes),
      })
    } else {
      const inner = labelParts(node.kind === 'link' ? node.label : node.alt)
      for (const part of inner) addPart(parts, part)
    }
  }
  return parts
}

/**
 * The words of a web link: its label, or its address in the readable form
 * when the label reads as an address or shows nothing, so a label cannot
 * hide where its link leads.
 */
export function linkWords(
  label: readonly InlineNode[],
  href: string,
): readonly AnswerPart[] {
  if (!labelHidesAddress(shownText(label))) return labelParts(label)
  return [{ kind: 'text', text: markdownParser.normalizeLinkText(href) }]
}
