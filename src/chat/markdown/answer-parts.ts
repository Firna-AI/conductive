import { markdownParser } from '../../markdown/parser'
import { labelHidesAddress, type WebLink } from '../../markdown/web-links'
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
 * The text that nodes show, as the chat tests a label (chat-links.md). A
 * line break is no character, so a label that shows an address on two
 * lines holds that address, as it does on one line.
 */
function shownText(nodes: readonly InlineNode[]): string {
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
function labelParts(nodes: readonly InlineNode[]): AnswerPart[] {
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
function linkWords(
  label: readonly InlineNode[],
  href: string,
): readonly AnswerPart[] {
  if (!labelHidesAddress(shownText(label))) return labelParts(label)
  return [{ kind: 'text', text: markdownParser.normalizeLinkText(href) }]
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
  return { kind: 'file-link', ...target, label: shown }
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
 * A Markdown image. No picture loads, as `chat-links.md` says: an
 * image of a file of the tree is a link that opens it, an image at a web
 * address shows its alt text as a link, by the rules of a label, and
 * another image shows its alt text only.
 */
function imageParts(node: InlineImage, reading: AnswerReading): AnswerPart[] {
  const file = fileLink(node.alt, node.href, reading)
  if (file) return [file]
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
