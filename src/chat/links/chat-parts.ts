import { labelHidesAddress, type WebLink } from '../../markdown/web-links'
import { attachmentForMention } from '../../shared/attachment-mentions'
import type { FileEntry } from '../../shared/generated/FileEntry'
import type { Attachment } from '../../shared/generated/Attachment'
import type { LineRange } from '../../shared/line-target'
import {
  codeTarget,
  fileLinkTarget,
  mentionTarget,
  type EntryLookup,
} from './file-targets'
import type { Mention } from '../../shared/mention-text'
import {
  tokens,
  type LinkToken,
  type MarkdownLink,
  type Token,
} from './chat-tokens'
import {
  addressWords,
  codePart,
  labelWords,
  type CodePart,
  type LinkPart,
  type LinkWord,
  type WebLinkOf,
} from './link-parts'
import {
  linkTarget,
  type LinkTarget,
  type WorkspaceLinks,
} from './workspace-links'

/** A part of a sent message or of an answer, as the chat shows it. */
export type ChatPart =
  | { kind: 'text'; text: string; strong: boolean }
  | CodePart
  | { kind: 'chip'; source: string; target: LinkTarget; strong: boolean }
  | LinkPart
  | FilePart
  | FileLinkPart
  | AttachmentPart

/** A part of the label of a link: text or code. */
type LabelPart = LinkWord

/**
 * A Markdown link or image of an answer whose target is an entry of the
 * file tree, such as `[the form](src/app.ts#L42)`. It shows as a link with
 * its label, which opens the file. An image with no label shows the name
 * of the file.
 */
export type FileLinkPart = {
  kind: 'file-link'
  source: string
  entry: FileEntry
  lines: LineRange | null
  label: LabelPart[]
  strong: boolean
}

/**
 * An entry of the file tree that the text names: a `@` mention, or inline
 * code of an answer. `source` is the text that a copy of its chip gives.
 */
export type FilePart = {
  kind: 'file'
  source: string
  entry: FileEntry
  lines: LineRange | null
  strong: boolean
}

/**
 * The mention of a file of the message, which shows as the chip of the
 * file. `path` is the copy path of the file that the mention names.
 */
export type AttachmentPart = {
  kind: 'attachment'
  source: string
  path: string
  attachment: Attachment
  strong: boolean
}

export type { EntryLookup }

/**
 * Splits a sent message or an answer into text, code, chips, and links,
 * with one reading for both. Code comes first, so a link in code is no
 * chip: code that holds only one web address that is a link shows it as a
 * link, and other code stays code. A Markdown link whose brackets stand
 * outside code is one unit, also when its label holds code or bold: it
 * shows as its chip alone when it names a workspace of the list.
 *
 * `web` says where each other address leads. A bare address shows as the
 * text has it. With `strong`, as in an answer, a Markdown link shows as its
 * label, with its code and bold, or as its address when the label reads as
 * one or shows nothing. Its link title does not show. In a message of a
 * member, a Markdown link shows as typed, and its address is a link as a
 * bare address is. So does the Markdown of an image, such as
 * `![alt](address)`. A Markdown link whose address is no link shows as
 * typed, with its code and bold. With `code` and a tree, a file target
 * instead shows its label as a link that opens the file.
 *
 * With `strong`, `**` marks bold around text, chips, and links. Bold ends
 * at code, as it did before. With `mentions`, as in a message of a member,
 * each mention of an entry of the file tree is a file chip, and each other
 * mention stays text. `attachments` are the files of a sent message: each
 * mention of the copy path of one of them is the chip of that file, before
 * an entry of the tree, also in a chat without a tree. With `code`, inline
 * paths of entries also show as file chips, with their line targets.
 */
export function chatParts(
  text: string,
  links: WorkspaceLinks,
  options: {
    strong: boolean
    web: WebLinkOf
    mentions?: EntryLookup
    code?: { root: string | null }
    attachments?: readonly Attachment[]
  },
): ChatPart[] {
  const parts: ChatPart[] = []
  const files = options.attachments ?? []
  // With a tree, each mention counts, and one that names nothing is text.
  // Without a tree, only the mention of a file of the message counts. Each
  // other `@` is plain text, so code or a link right after it keeps its part.
  const counts = (mention: Mention) =>
    options.mentions !== undefined ||
    attachmentForMention(mention, files) !== undefined
  let strong = false
  const addText = (value: string) => {
    const last = parts.at(-1)
    if (last?.kind === 'text' && last.strong === strong) last.text += value
    else parts.push({ kind: 'text', text: value, strong })
  }
  const addMention = (mention: Mention) => {
    const { source, path } = mention
    const attachment = attachmentForMention(mention, files)
    if (attachment) {
      parts.push({ kind: 'attachment', source, path, attachment, strong })
      return
    }
    const found = options.mentions && mentionTarget(mention, options.mentions)
    if (!found) addText(source)
    else {
      parts.push({
        kind: 'file',
        source: found.source,
        ...found.target,
        strong,
      })
      if (found.rest !== '') addText(found.rest)
    }
  }
  const addLink = (link: WebLink, words: readonly LinkWord[]) => {
    parts.push({ kind: 'link', link, words, strong })
  }
  /** A bare address: a chip, a link, or text. */
  const addAddress = (href: string) => {
    const target = linkTarget(href, links)
    const link = target ? undefined : options.web(href)
    if (target) parts.push({ kind: 'chip', source: href, target, strong })
    else if (link) addLink(link, addressWords(href))
    else addText(href)
  }
  /** Text that shows as typed, with its code and bold but no link. */
  const typed = (value: string) =>
    take(
      tokens(value, {
        marks: options.strong,
        links: false,
        mentions: () => false,
      }),
      false,
    )
  const addMarkdown = (token: LinkToken, markdown: MarkdownLink) => {
    const { href, source } = token
    const { mentions, code } = options
    const file = mentions && code && fileLinkTarget(href, mentions, code.root)
    if (file) {
      const label =
        markdown.label.trim() === '' ? file.entry.name : markdown.label
      parts.push({
        kind: 'file-link',
        source,
        ...file,
        label: labelWords(label),
        strong,
      })
      return
    }
    if (!markdown.image) {
      const target = linkTarget(href, links)
      if (target) {
        parts.push({ kind: 'chip', source, target, strong })
        return
      }
      const link = options.strong ? options.web(href) : undefined
      if (link) {
        const { label } = markdown
        const words = labelHidesAddress(label)
          ? addressWords(href)
          : labelWords(label)
        addLink(link, words)
        return
      }
    }
    typed(markdown.before)
    addAddress(href)
    typed(markdown.after)
  }
  // Only code of the text itself links its address. Code in a label that
  // shows as typed stays code.
  const take = (list: readonly Token[], linked: boolean) => {
    for (const token of list) {
      if (token.kind === 'mark') strong = !strong
      else if (token.kind === 'text') addText(token.text)
      else if (token.kind === 'code') {
        strong = false
        const { mentions, code } = options
        const file =
          linked &&
          mentions &&
          code &&
          codeTarget(token.text, mentions, code.root)
        if (file)
          parts.push({ kind: 'file', source: token.text, ...file, strong })
        else parts.push(linked ? codePart(token.text, options.web) : token)
      } else if (token.kind === 'mention') addMention(token.mention)
      else if (token.markdown) addMarkdown(token, token.markdown)
      else addAddress(token.href)
    }
  }
  take(
    tokens(text, {
      marks: options.strong,
      links: true,
      mentions: counts,
      paths: options.code !== undefined && options.mentions !== undefined,
    }),
    true,
  )
  return parts
}

/**
 * The files of a message that no part shows as a chip, in their order. A
 * file whose mention stands only in code, or that the text does not
 * mention, such as a file of a message from before files had a place in
 * the text, shows under the message.
 */
export function filesWithoutChip(
  parts: readonly ChatPart[],
  attachments: readonly Attachment[],
): Attachment[] {
  const shown = new Set(
    parts.flatMap((part) =>
      part.kind === 'attachment' ? [part.attachment.id] : [],
    ),
  )
  return attachments.filter((file) => !shown.has(file.id))
}
