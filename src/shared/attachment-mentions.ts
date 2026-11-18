import type { Attachment } from './generated/Attachment'
import { mentionParts, type Mention } from './mention-text'

export function attachmentForMention(
  mention: Mention,
  attachments: readonly Attachment[],
): Attachment | undefined {
  return mention.folder
    ? undefined
    : attachments.find((file) => file.path === mention.path)
}

export function textWithAttachmentNames(
  text: string,
  attachments: readonly Attachment[],
  name: (value: string) => string = (value) => value,
): string {
  return mentionParts(text)
    .map((part) => {
      if (part.kind === 'text') return part.text
      const attachment = attachmentForMention(part, attachments)
      return attachment ? name(attachment.name) : part.source
    })
    .join('')
}

/**
 * The text that a title starts from. Each mention of an attached image
 * goes out, with the spaces and tabs after it, because image names such as
 * "Screenshot 2026-11-16 at 10.23.45.png" do not name the task. Each
 * mention of another attached file becomes its original name. Each other
 * mention stays as it is. See "Messages" in
 * `docs/protocol/messages-and-attachments.md`.
 */
export function titleSourceText(
  text: string,
  attachments: readonly Attachment[],
): string {
  let afterImage = false
  return mentionParts(text)
    .map((part) => {
      if (part.kind === 'text') {
        const value = afterImage ? part.text.replace(/^[ \t]+/, '') : part.text
        afterImage = false
        return value
      }
      const attachment = attachmentForMention(part, attachments)
      afterImage = attachment?.kind === 'image'
      if (!attachment) return part.source
      return afterImage ? '' : attachment.name
    })
    .join('')
}

export function hasOwnWords(
  text: string,
  attachments: readonly Attachment[],
): boolean {
  return mentionParts(text).some((part) =>
    part.kind === 'text'
      ? part.text.trim() !== ''
      : attachmentForMention(part, attachments) === undefined,
  )
}
