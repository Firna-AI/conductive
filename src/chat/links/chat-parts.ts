import { attachmentForMention } from '../../shared/attachment-mentions'
import type { FileEntry } from '../../shared/files'
import type { LineRange } from '../../shared/line-target'
import type { Attachment } from '../../shared/messages'
import type { Mention } from '../../shared/mention-text'
import { tokens, type Reading, type Token } from './chat-tokens'
import {
  codeTarget,
  fileLinkTarget,
  mentionTarget,
  type EntryLookup,
  type FileTarget,
} from './file-targets'
import {
  linkTarget,
  type LinkTarget,
  type WorkspaceLinks,
} from './workspace-links'

/** A part of a sent message or of an answer, as the chat shows it. */
export type ChatPart =
  | { kind: 'text'; text: string; strong: boolean }
  | { kind: 'code'; text: string }
  | { kind: 'chip'; source: string; target: LinkTarget; strong: boolean }
  | FilePart
  | FileLinkPart
  | AttachmentPart

/** A part of the label of a link: text or code. */
type LabelPart = Extract<ChatPart, { kind: 'text' } | { kind: 'code' }>

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

/** The parts of the label of a link: text and code, with their bold. */
function labelParts(label: string, marks: boolean): LabelPart[] {
  const reading: Reading = { marks, links: false, mentions: () => false }
  const found: LabelPart[] = []
  let strong = false
  for (const token of tokens(label, reading)) {
    if (token.kind === 'mark') strong = !strong
    else if (token.kind === 'code') {
      strong = false
      found.push(token)
    } else if (token.kind === 'text') {
      found.push({ kind: 'text', text: token.text, strong })
    }
  }
  return found
}

/**
 * Splits a sent message or an answer into text, code, and chips, with one
 * reading for both. Code comes first, so a link in code stays code. A
 * Markdown link whose brackets stand outside code is one unit, also when
 * its label holds code or bold: it shows as its chip alone when it names a
 * workspace of the list. Each other link shows its source as before: a
 * Markdown link with the code and the bold of its source. With `strong`,
 * as in an answer, `**` marks bold around text and chips. Bold ends at
 * code, as it did before. With `mentions`, as in a message of a member,
 * each mention of an entry of the file tree is a file chip, and each other
 * mention stays text. A mention can end with a line target, and an end
 * mark of a sentence right after it stays text. With `code`, as in an
 * answer, inline code that is the path of an entry is a file chip too, as
 * `codeTarget` says. `attachments` are the files of a sent message: each
 * mention of the copy path of one of them is the chip of that file, before
 * an entry of the tree, also in a chat without a tree.
 */
export function chatParts(
  text: string,
  links: WorkspaceLinks,
  options: {
    strong: boolean
    mentions?: EntryLookup
    /** Inline code can name an entry, under the folder `root` when absolute. */
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
  const addFile = (source: string, target: FileTarget) => {
    parts.push({ kind: 'file', source, ...target, strong })
  }
  const addMention = (mention: Mention) => {
    const { source, path } = mention
    const attachment = attachmentForMention(mention, files)
    if (attachment) {
      parts.push({ kind: 'attachment', source, path, attachment, strong })
      return
    }
    const found = options.mentions && mentionTarget(mention, options.mentions)
    if (!found) {
      addText(source)
      return
    }
    addFile(found.source, found.target)
    if (found.rest !== '') addText(found.rest)
  }
  // Code in the label of a Markdown link stays code, so no chip sits in a
  // link.
  let label = false
  const addCode = (text: string) => {
    strong = false
    const { mentions, code } = options
    const target =
      !label && mentions && code && codeTarget(text, mentions, code.root)
    if (target) addFile(text, target)
    else parts.push({ kind: 'code', text })
  }
  /** The entry that a Markdown link of an answer names, as a part. */
  const fileLink = (token: Extract<Token, { kind: 'link' }>) => {
    const { mentions, code } = options
    if (!token.markdown || label || !mentions || !code) return null
    const target = fileLinkTarget(token.href, mentions, code.root)
    if (!target) return null
    const text = token.label ?? ''
    const shown =
      text.trim() === ''
        ? [{ kind: 'text' as const, text: target.entry.name, strong: false }]
        : labelParts(text, options.strong)
    const part: FileLinkPart = {
      kind: 'file-link',
      source: token.source,
      ...target,
      label: shown,
      strong,
    }
    return part
  }
  const take = (list: readonly Token[]) => {
    for (const token of list) {
      if (token.kind === 'mark') strong = !strong
      else if (token.kind === 'text') addText(token.text)
      else if (token.kind === 'code') addCode(token.text)
      else if (token.kind === 'mention') addMention(token.mention)
      else {
        const target = linkTarget(token.href, links)
        const file = target ? null : fileLink(token)
        if (target) {
          parts.push({ kind: 'chip', source: token.source, target, strong })
        } else if (file) parts.push(file)
        else if (token.markdown) {
          label = true
          take(
            tokens(token.source, {
              marks: options.strong,
              links: false,
              mentions: () => false,
            }),
          )
          label = false
        } else addText(token.source)
      }
    }
  }
  take(
    tokens(text, {
      marks: options.strong,
      links: true,
      mentions: counts,
      paths: options.code !== undefined && options.mentions !== undefined,
    }),
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
