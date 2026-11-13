import type { RunnerBranches } from '../../../src/shared/runner'
import {
  attachmentDescription,
  attachmentReadInstruction,
} from './attachment-description'
import { providerMessage } from './message'
import { codexSkillInputs, type SkillSource } from './skill-input'
import type { ProviderInput } from './types'

/**
 * The `turn/start` and `turn/steer` input of one message: the text with its
 * sender line, one skill input for each skill of the text, then the read
 * instruction and one line for each attached file, each image after its line.
 */
export function codexInput(
  command: ProviderInput,
  skills: SkillSource,
  branches?: RunnerBranches | null,
) {
  return [
    {
      type: 'text',
      text: providerMessage(command.message, command.branches, branches),
      text_elements: [],
    },
    ...codexSkillInputs(command.message.text, skills),
    ...(command.attachments.length
      ? [
          {
            type: 'text',
            text:
              attachmentReadInstruction +
              (command.message.attachments.some((file) => file.kind === 'image')
                ? ' Each image is also in this message.'
                : ''),
            text_elements: [],
          },
        ]
      : []),
    ...command.attachments.flatMap((attachment) => {
      const metadata = command.message.attachments.find(
        (item) => item.id === attachment.attachmentId,
      )
      const description = {
        type: 'text',
        text: attachmentDescription(command, attachment),
        text_elements: [],
      }
      return metadata?.kind === 'image'
        ? [description, { type: 'localImage', path: attachment.path }]
        : [description]
    }),
  ]
}
