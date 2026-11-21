import { attachmentForMention } from '../../shared/attachment-mentions'
import type { AgentSkill } from '../../shared/generated/AgentSkill'
import type { FileEntry } from '../../shared/generated/FileEntry'
import type { Attachment } from '../../shared/generated/Attachment'
import type { LineRange } from '../../shared/line-target'
import { mentionTarget, type EntryLookup } from './file-targets'
import type { Mention } from '../../shared/mention-text'
import {
  tokens,
  type LinkToken,
  type MarkdownLink,
  type SkillLookup,
  type Token,
} from './chat-tokens'
import {
  codePart,
  type CodePart,
  type LinkPart,
  type WebLinkOf,
} from './link-parts'
import {
  linkTarget,
  type LinkTarget,
  type WorkspaceLinks,
} from './workspace-links'

/** A part of a sent message, as the chat shows it. */
export type ChatPart =
  | { kind: 'text'; text: string }
  | CodePart
  | { kind: 'chip'; source: string; target: LinkTarget }
  | LinkPart
  | FilePart
  | { kind: 'skill'; source: string; skill: AgentSkill }
  | AttachmentPart

/**
 * An entry of the file tree that the text names: a `@` mention, or inline
 * code of an answer. `source` is the text that a copy of its chip gives.
 */
export type FilePart = {
  kind: 'file'
  source: string
  entry: FileEntry
  lines: LineRange | null
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
}

export type { EntryLookup }

/**
 * Splits a sent message into text, code, chips, and links. Code comes
 * first, so a link in code is no chip: code that holds only one web
 * address that is a link shows it as a link, and other code stays code. A
 * Markdown link whose brackets stand outside code is one unit, also when
 * its label holds code: it shows as its chip alone when it names a
 * workspace of the list. Otherwise it shows as typed, and its address is a
 * link as a bare address is. So does the Markdown of an image, such as
 * `![alt](address)`. `web` says where each address leads. A bare address
 * shows as the text has it.
 *
 * With `mentions`, each mention of an entry of the file tree is a file
 * chip, and each other mention stays text. With `skills`, each skill text
 * that names a skill of either agent is a skill chip, as `skillTextAt`
 * reads it. Each other skill text stays text, and a skill text in code
 * stays code. `attachments` are the files of the message: each mention of
 * the copy path of one of them is the chip of that file, before an entry
 * of the tree, also in a chat without a tree.
 * The text of an agent message reads through `answerParts` instead.
 */
export function chatParts(
  text: string,
  links: WorkspaceLinks,
  options: {
    web: WebLinkOf
    mentions?: EntryLookup
    skills?: SkillLookup
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
  const addText = (value: string) => {
    const last = parts.at(-1)
    if (last?.kind === 'text') last.text += value
    else parts.push({ kind: 'text', text: value })
  }
  const addMention = (mention: Mention) => {
    const { source, path } = mention
    const attachment = attachmentForMention(mention, files)
    if (attachment) {
      parts.push({ kind: 'attachment', source, path, attachment })
      return
    }
    const found = options.mentions && mentionTarget(mention, options.mentions)
    if (!found) addText(source)
    else {
      parts.push({ kind: 'file', source: found.source, ...found.target })
      if (found.rest !== '') addText(found.rest)
    }
  }
  /** An address: a chip, a link, or text. */
  const addAddress = (href: string, source = href) => {
    const target = linkTarget(href, links)
    const link = target ? undefined : options.web(href)
    if (target) parts.push({ kind: 'chip', source, target })
    else if (link) parts.push({ kind: 'link', link, text: source })
    else addText(source)
  }
  /** Text that shows as typed, with its code but no link. */
  const typed = (value: string) =>
    take(tokens(value, { links: false, mentions: () => false }), false)
  const addMarkdown = (token: LinkToken, markdown: MarkdownLink) => {
    const { href, source } = token
    const target = markdown.image ? undefined : linkTarget(href, links)
    if (target) {
      parts.push({ kind: 'chip', source, target })
      return
    }
    typed(markdown.before)
    addAddress(href, markdown.address)
    typed(markdown.after)
  }
  // Only code of the text itself links its address. Code in a label that
  // shows as typed stays code.
  const take = (list: readonly Token[], linked: boolean) => {
    for (const token of list) {
      if (token.kind === 'text') addText(token.text)
      else if (token.kind === 'code') {
        parts.push(linked ? codePart(token.text, options.web) : token)
      } else if (token.kind === 'mention') addMention(token.mention)
      else if (token.kind === 'skill') parts.push(token)
      else if (token.markdown) addMarkdown(token, token.markdown)
      else addAddress(token.href)
    }
  }
  take(
    tokens(text, {
      links: true,
      mentions: counts,
      skills: options.skills,
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
