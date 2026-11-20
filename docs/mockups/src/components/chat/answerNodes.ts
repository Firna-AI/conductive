import type {
  InlineImage,
  InlineLink,
  InlineText,
} from '../../../../../src/chat/markdown/agent-inline'
import { pictureType } from '../../../../../src/files/page/file-view'
import {
  keptBreaks,
  showsText,
  type BreakNodes,
} from '../../../../../src/markdown/kept-breaks'
import { webAddressParts } from '../../../../../src/markdown/web-links'
import type { MarkNode } from '../common/markdownMarks'
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
 * as a normal link with its label, which opens the file. `picture` marks
 * the Markdown image of a PNG, JPEG, GIF, or WebP file, which can show as
 * its picture (screenshot decision 2). The file tab shows the same files
 * as pictures, so an SVG file stays a link.
 */
export type FileLinkPart = {
  kind: 'file-link'
  label: string
  source: string
  picture: boolean
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

/** A node of the text of an answer: text, a line break, a unit, or a mark. */
export type AnswerNode = MarkNode<AnswerPart>

function unit(part: AnswerPart): AnswerNode {
  return { kind: 'unit', unit: part }
}

/**
 * The words of a label or of alt text: its text and its code without their
 * marks, with a space for each line break.
 */
function wordsOf(nodes: InlineText): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case 'text':
        case 'code':
          return node.text
        case 'break':
          return ' '
        case 'mark':
          return wordsOf(node.nodes)
        case 'link':
          return wordsOf(node.label)
        case 'image':
          return wordsOf(node.alt)
      }
    })
    .join('')
}

/**
 * A Markdown link or image whose target is an entry of the tree, which
 * opens the file. A label with no text shows the name of the entry. The
 * image of a picture file can show as its picture.
 */
function fileLink(
  href: string,
  label: string,
  source: string,
  image: boolean,
): FileLinkPart | undefined {
  const target = fileTarget(href)
  if (!target) return undefined
  const { folder, path } = target.entry
  return {
    kind: 'file-link',
    label: label.trim() === '' ? entryName(target.entry) : label,
    source,
    picture: image && !folder && pictureType(path) !== undefined,
    ...target,
  }
}

/**
 * A Markdown link: a link to a file of the tree, or a link with its label,
 * which `Part` draws as the chip of a workspace or as a web link.
 */
function linkPart(link: InlineLink): AnswerPart {
  const label = wordsOf(link.label)
  const source = `${link.typed.open}${label}${link.typed.close}`
  return (
    fileLink(link.href, label, source, false) ?? {
      kind: 'link',
      href: link.href,
      source,
      label,
    }
  )
}

/** A Markdown image: a link or a picture of a file, or its alt text. */
function imagePart(image: InlineImage): AnswerPart {
  const alt = wordsOf(image.alt)
  const { href, source } = image
  return (
    fileLink(href, alt, source, true) ?? { kind: 'image', alt, href, source }
  )
}

/**
 * Inline code, or the file chip of the entry of the tree that the whole
 * code names (answer chip decision 1). A web address alone in code is a
 * link inside its code box.
 */
function codePart(text: string): AnswerPart {
  const target = codeTarget(text)
  return target
    ? { kind: 'mention', ...target, source: text }
    : webCodePart(text)
}

/**
 * A text node with its bare addresses, each one unit, and its mentions. A
 * mention can start right after a mark, and it ends before a `*` or a `~~`
 * that the text keeps as typed (design call 11).
 */
function textNodes(text: string): AnswerNode[] {
  return webAddressParts(text, false).flatMap((part): AnswerNode[] => {
    if (part.kind !== 'text') return [unit(part)]
    return mentionParts(part.text, [], true).map((piece): AnswerNode =>
      piece.kind === 'text' ? piece : unit(piece),
    )
  })
}

/** The nodes of inline text, with the units that the mockups read. */
function nodesOf(nodes: InlineText): AnswerNode[] {
  return nodes.flatMap((node): AnswerNode[] => {
    switch (node.kind) {
      case 'text':
        return textNodes(node.text)
      case 'code':
        return [unit(codePart(node.text))]
      case 'break':
        return [{ kind: 'break' }]
      case 'mark':
        return [
          { kind: 'mark', mark: node.mark, children: nodesOf(node.nodes) },
        ]
      case 'link':
        return [unit(linkPart(node))]
      case 'image':
        return [unit(imagePart(node))]
    }
  })
}

/**
 * How the rule of the line breaks reads the nodes: a mark holds nodes, and
 * each unit shows something.
 */
const breakNodes: BreakNodes<AnswerNode> = {
  inner: (node) => (node.kind === 'mark' ? node.children : null),
  rebuilt: (node, children) => {
    if (node.kind !== 'mark') return node
    return children.length > 0 ? { ...node, children } : null
  },
  leaf: (node) => {
    if (node.kind === 'break') return 'break'
    return node.kind === 'text' && node.text.trim() === '' ? 'blank' : 'shows'
  },
}

/**
 * The inline text of one block of an answer, as the fixtures write it with
 * the inline tree of the app: its bold text, emphasis, strikethrough, line
 * breaks, Markdown links, and images, with the units that the mockups read
 * where the text draws. A link or an image to an entry of the tree is a
 * link to the file. Inline code whose whole text is a path of the tree is
 * a file chip. In the text between them, each bare address is a unit, and
 * each mention of the tree is a file chip. The line breaks follow the rule
 * of `src/markdown/kept-breaks.ts`: a break at the start or at the end of
 * the block draws nothing, and two or more breaks in a row draw at most one
 * empty line.
 */
export function answerNodes(text: InlineText): AnswerNode[] {
  return keptBreaks(nodesOf(text), breakNodes)
}

/** Whether the inline text of a block shows words, as `answerNodes` reads it. */
export function textShowsWords(text: InlineText): boolean {
  return showsText(nodesOf(text), breakNodes)
}
