import {
  ATTACHMENT_IMAGE_MAX_BYTES,
  attachmentDescription,
  attachmentReadInstruction,
} from './attachment-description'
import { contextLines, providerNotice, type FixedContext } from './message'
import { codexSkillInputs, type SkillSource } from './skill-input'
import type { ProviderInput } from '../generated/ProviderInput'

/**
 * The `turn/start` and `turn/steer` input of one message: the member's text,
 * one skill input for each skill of the text, the read instruction and one
 * line for each attached file, each image of up to
 * `ATTACHMENT_IMAGE_MAX_BYTES` right after its line, and last the sender
 * lines, with the change notes of a turn after them. A larger image gets
 * only its file line. A notice of a running turn has only its app text.
 */
export function codexInput(
  command: ProviderInput,
  skills: SkillSource,
  fixed: FixedContext = {},
) {
  if (command.type === 'notice')
    return [
      {
        type: 'text',
        text: providerNotice(command.notices),
        text_elements: [],
      },
    ]
  const images = command.attachments.filter((attachment) => {
    const metadata = command.message.attachments.find(
      (item) => item.id === attachment.attachmentId,
    )
    return (
      metadata?.kind === 'image' &&
      metadata.sizeBytes <= ATTACHMENT_IMAGE_MAX_BYTES
    )
  })
  return [
    { type: 'text', text: command.message.text, text_elements: [] },
    ...codexSkillInputs(command.message.text, skills),
    ...(command.attachments.length
      ? [
          {
            type: 'text',
            text:
              attachmentReadInstruction +
              (images.length
                ? ' Only an image that comes right after its file line is also in this message.'
                : ''),
            text_elements: [],
          },
        ]
      : []),
    ...command.attachments.flatMap((attachment) => {
      const description = {
        type: 'text',
        text: attachmentDescription(command, attachment),
        text_elements: [],
      }
      return images.includes(attachment)
        ? [description, { type: 'localImage', path: attachment.path }]
        : [description]
    }),
    {
      type: 'text',
      text: contextLines(command, fixed),
      text_elements: [],
    },
  ]
}
