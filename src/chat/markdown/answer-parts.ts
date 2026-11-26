import { pictureType } from '../../files/page/file-view'
import type { WebLink } from '../../markdown/web-links'
import type { FilePart } from '../links/chat-parts'
import {
  codeTarget,
  fileLinkTarget,
  type EntryLookup,
  type FileTarget,
} from '../links/file-targets'
import { codePart, type CodePart, type WebLinkOf } from '../links/link-parts'
import {
  linkTarget,
  type LinkTarget,
  type WorkspaceLinks,
} from '../links/workspace-links'
import { answerBreaks } from './agent-breaks'
import type {
  InlineImage,
  InlineLink,
  InlineMark,
  InlineNode,
} from './agent-inline'
import { labelParts, linkWords, shownText } from './answer-labels'
import { addPart, textParts } from './answer-text'

/** A web link of an agent message, with its words. */
interface AnswerLink {
  kind: 'link'
  link: WebLink
  words: readonly AnswerPart[]
}

/**
 * A Markdown link or image of an agent message whose target is an entry
 * of the tree. It shows as a link with its label, which opens the file.
 */
interface FileLinkPart extends FileTarget {
  kind: 'file-link'
  label: readonly AnswerPart[]
  /**
   * Set for the Markdown image of a PNG, JPEG, GIF, or WebP file, such as
   * `![Phone view](shots/after.png)`, which can show as its picture, as
   * "Pictures in answers" of `file-mentions-answers.md` says. `source` is
   * the image as the agent wrote it, which a copy of the picture gives. The
   * file tab shows the same files as pictures, so the image of an SVG file
   * and a link without `!` stay links.
   */
  picture: { source: string } | null
}

/**
 * A part of the text of an agent message, as the chat draws it: text,
 * inline code, a line break, a mark around parts, the chip of a
 * workspace, a web link, the chip of a file, or a link to a file.
 */
export type AnswerPart =
  | { kind: 'text'; text: string }
  | CodePart
  | { kind: 'break' }
  | { kind: 'mark'; mark: InlineMark; parts: readonly AnswerPart[] }
  | { kind: 'chip'; target: LinkTarget }
  | AnswerLink
  | FilePart
  | FileLinkPart

/** What the chat reads the text of an agent message with. */
export interface AnswerReading {
  /** The workspaces whose links show as chips. */
  links: WorkspaceLinks
  /** Where each web address leads, or undefined when it stays text. */
  web: WebLinkOf
  /**
   * The entries of the tree and the folder of the repository, while the
   * chat has a tree. Without them, mentions stay text and paths stay code.
   */
  files?: { find: EntryLookup; root: string | null }
}

/**
 * A link or an image whose target is an entry of the tree, as a link with
 * its label. A label that shows nothing shows the name of the entry.
 */
function fileLink(
  label: readonly InlineNode[],
  href: string,
  reading: AnswerReading,
): FileLinkPart | null {
  const { files } = reading
  const target = files && fileLinkTarget(href, files.find, files.root)
  if (!target) return null
  const shown: readonly AnswerPart[] =
    shownText(label).trim() === ''
      ? [{ kind: 'text', text: target.entry.name }]
      : labelParts(label)
  return { kind: 'file-link', ...target, label: shown, picture: null }
}

/** The picture of an image whose target is a picture file, or null. */
function pictureOf(
  target: FileTarget,
  image: InlineImage,
): FileLinkPart['picture'] {
  const { entry } = target
  if (entry.kind !== 'file' || pictureType(entry.path) === undefined) {
    return null
  }
  return { source: image.source }
}

/**
 * A Markdown link or an address in angle brackets: a link to a file, the
 * chip of a workspace, or a web link. A link that leads nowhere shows as
 * the agent typed it, with the formatting of its label.
 */
function linkParts(node: InlineLink, reading: AnswerReading): AnswerPart[] {
  const file = fileLink(node.label, node.href, reading)
  if (file) return [file]
  const target = linkTarget(node.href, reading.links)
  if (target) return [{ kind: 'chip', target }]
  const link = reading.web(node.href)
  if (link)
    return [{ kind: 'link', link, words: linkWords(node.label, node.href) }]
  const parts: AnswerPart[] = [{ kind: 'text', text: node.typed.open }]
  for (const part of labelParts(node.label)) addPart(parts, part)
  addPart(parts, { kind: 'text', text: node.typed.close })
  return parts
}

/**
 * A Markdown image, as `chat-links.md` and `file-mentions-answers.md` say:
 * an image of a file of the tree is a link that opens it, and the image of
 * a picture file can show as its picture there. An image at a web address
 * shows its alt text as a link, by the rules of a label, and loads no
 * picture. Another image shows its alt text only.
 */
function imageParts(node: InlineImage, reading: AnswerReading): AnswerPart[] {
  const file = fileLink(node.alt, node.href, reading)
  if (file) return [{ ...file, picture: pictureOf(file, node) }]
  const link = reading.web(node.href)
  if (link)
    return [{ kind: 'link', link, words: linkWords(node.alt, node.href) }]
  return labelParts(node.alt)
}

/** Inline code: the chip of the entry of the tree that it names, or code. */
function codeParts(text: string, reading: AnswerReading): AnswerPart {
  const { files } = reading
  const target = files && codeTarget(text, files.find, files.root)
  if (target) return { kind: 'file', source: text, ...target }
  return codePart(text, reading.web)
}

/**
 * The parts of one node. `start` says whether a mention can start at the
 * start of a text node.
 */
function nodeParts(
  node: InlineNode,
  reading: AnswerReading,
  start: boolean,
): AnswerPart[] {
  switch (node.kind) {
    case 'text':
      return textParts(node.text, reading, start)
    case 'code':
      return [codeParts(node.text, reading)]
    case 'break':
      return [{ kind: 'break' }]
    case 'mark':
      return [
        {
          kind: 'mark',
          mark: node.mark,
          parts: inlineParts(node.nodes, reading),
        },
      ]
    case 'link':
      return linkParts(node, reading)
    case 'image':
      return imageParts(node, reading)
  }
}

/**
 * The parts of inline nodes, with their chips and their links. A mention
 * can start at the start of the nodes, after a line break, and right after
 * a mark, and it ends before the closing mark, as "The text of a mention"
 * of `file-mentions.md` says.
 */
function inlineParts(
  nodes: readonly InlineNode[],
  reading: AnswerReading,
): AnswerPart[] {
  const parts: AnswerPart[] = []
  let start = true
  for (const node of nodes) {
    for (const part of nodeParts(node, reading, start)) addPart(parts, part)
    start = node.kind === 'break' || node.kind === 'mark'
  }
  return parts
}

/**
 * The parts that the chat draws for the inline text of one block of an
 * agent message: its chips and its links, as `inlineParts` reads them,
 * with the line breaks that the whole block draws, as `answerBreaks` says.
 * So a break in the label of a link counts where the link shows it.
 */
export function answerParts(
  nodes: readonly InlineNode[],
  reading: AnswerReading,
): AnswerPart[] {
  return answerBreaks(inlineParts(nodes, reading))
}

/**
 * Whether parts show words: text or code with a character other than white
 * space, the chip of a workspace or of a file, or a mark, a web link, or a
 * link to a file whose parts show words. A line break shows no words.
 */
function partsShowWords(parts: readonly AnswerPart[]): boolean {
  return parts.some((part) => {
    switch (part.kind) {
      case 'text':
      case 'code':
        return part.text.trim() !== ''
      case 'break':
        return false
      case 'mark':
        return partsShowWords(part.parts)
      case 'link':
        return partsShowWords(part.words)
      case 'file-link':
        return partsShowWords(part.label)
      case 'chip':
      case 'file':
        return true
    }
  })
}

/**
 * Whether the inline text of a block shows words where the chat draws it,
 * as `answerParts` reads it with `reading`. So an image shows its alt text,
 * the name of its file, or its address, as `imageParts` says, and an image
 * with no alt text that opens nothing shows no words. The words depend on
 * the workspaces, the tree, and the links of the screen, so a heading and
 * the name of a message line read them where they draw, with what the text
 * draws with, and again at each change of it.
 */
export function answerShowsWords(
  nodes: readonly InlineNode[],
  reading: AnswerReading,
): boolean {
  return partsShowWords(answerParts(nodes, reading))
}

/**
 * Whether the text can hold a chip or a link of a file, so that it follows
 * the tree: a `@`, inline code, or a link or an image. So a change of the
 * tree draws only the texts that can change.
 */
export function namesFiles(nodes: readonly InlineNode[]): boolean {
  return nodes.some((node) => {
    if (node.kind === 'text') return node.text.includes('@')
    if (node.kind === 'mark') return namesFiles(node.nodes)
    return node.kind !== 'break'
  })
}
