import { webAddressParts } from '../../../../../src/markdown/web-links'
import { breakItems, keptBreaks } from '../common/markdownBreaks'
import {
  markNodes,
  type MarkItem,
  type MarkNode,
} from '../common/markdownMarks'
import {
  codeTarget,
  linkTarget as fileTarget,
  type PathTarget,
} from './answerPaths'
import { entryName } from './entryPaths'
import { mentionParts } from './fileMentions'
import { webCodePart, type TextPart } from './workspaceLinks'

/**
 * A Markdown link or image of an answer to an entry of the tree. It shows
 * as a normal link with its label, which opens the file.
 */
export type FileLinkPart = {
  kind: 'file-link'
  label: string
  source: string
} & PathTarget

/**
 * A Markdown image whose target is no entry of the tree, such as a picture
 * at a web address. No picture loads: it shows its alt text, as a link when
 * its target is a web address (item 5 A of 17 November 2026).
 */
export type ImagePart = {
  kind: 'image'
  alt: string
  href: string
  source: string
}

/** A unit of the text of an answer, which its marks do not read into. */
export type AnswerPart = TextPart | FileLinkPart | ImagePart

/** A node of the text of an answer, after its marks pair. */
export type AnswerNode = MarkNode<AnswerPart>

type AnswerItem = MarkItem<AnswerPart>

/** A Markdown link or image whose target is not a web address. */
const pathLinkPattern = /!?\[([^\]\n]*)\]\((?:<([^<>\n]+)>|([^\s()<>]+))\)/g

function unit(part: AnswerPart, source: string): AnswerItem {
  return { kind: 'unit', unit: part, source }
}

/**
 * Text with its Markdown links, its images at web addresses, and its bare
 * addresses, each one unit, and its line breaks. A bare address is a unit
 * before the marks pair, as the chat parser keeps it whole (design call 8),
 * so a mark in its path or its query, such as the `__` of `__tests__`,
 * stays in the address.
 */
function webLinkItems(text: string): AnswerItem[] {
  const items: AnswerItem[] = []
  let rest = ''
  for (const part of webAddressParts(text)) {
    if (part.kind === 'text') {
      rest += part.text
      continue
    }
    const { href, source, label } = part
    const image = label !== undefined && rest.endsWith('!')
    items.push(...breakItems<AnswerPart>(image ? rest.slice(0, -1) : rest))
    items.push(
      image
        ? unit(
            { kind: 'image', alt: label, href, source: `!${source}` },
            `!${source}`,
          )
        : unit(part, source),
    )
    rest = ''
  }
  return [...items, ...breakItems<AnswerPart>(rest)]
}

/**
 * Text with its Markdown links and images to entries of the tree, each one
 * unit. A label with no text shows the name of the entry. Each other part
 * reads as `webLinkItems` says.
 */
function fileLinkItems(text: string): AnswerItem[] {
  const items: AnswerItem[] = []
  let end = 0
  for (const match of text.matchAll(pathLinkPattern)) {
    const target = fileTarget(match[2] ?? match[3] ?? '')
    if (!target) continue
    items.push(...webLinkItems(text.slice(end, match.index)))
    const label = match[1].trim() === '' ? entryName(target.entry) : match[1]
    const [source] = match
    items.push(unit({ kind: 'file-link', label, source, ...target }, source))
    end = match.index + source.length
  }
  return [...items, ...webLinkItems(text.slice(end))]
}

/**
 * Inline code, or the file chip of the entry of the tree that the whole
 * code names (answer chip decision 1). A web address alone in code is a
 * link inside its code box.
 */
function codeItem(text: string): AnswerItem {
  const target = codeTarget(text)
  const part: AnswerPart = target
    ? { kind: 'mention', ...target, source: text }
    : webCodePart(text)
  return unit(part, `\`${text}\``)
}

/** Text between the marks, with its mentions. */
function textNodes(text: string): AnswerNode[] {
  return mentionParts(text, [], true).map((part): AnswerNode =>
    part.kind === 'text' ? part : { kind: 'unit', unit: part },
  )
}

/** The nodes, with the text between the marks read at each depth. */
function withText(nodes: readonly AnswerNode[]): AnswerNode[] {
  return nodes.flatMap((node): AnswerNode[] => {
    if (node.kind === 'mark') {
      return [{ ...node, children: withText(node.children) }]
    }
    return node.kind === 'text' ? textNodes(node.text) : [node]
  })
}

/**
 * The text of an answer, in the order in which the parser reads it: code
 * first, then Markdown links, images, and bare addresses, then line
 * breaks, then the marks around them, and last, in the text between the
 * marks, the mentions. So `**` around code, a chip, or a link makes it
 * bold, and an unpaired `**` shows as typed (design call 7). A path keeps
 * its `_`, and a mention inside marks ends before the closing mark (design
 * call 11). `live` reads text that the agent still writes: a mark that can
 * only open closes at its end, so `**Next:` shows bold (item 9 C).
 */
export function answerNodes(text: string, live = false): AnswerNode[] {
  const items = text
    .split('`')
    .flatMap((part, index) =>
      index % 2 === 1 ? [codeItem(part)] : fileLinkItems(part),
    )
  return withText(markNodes(keptBreaks(items), live))
}
