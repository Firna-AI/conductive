import { defineComponent } from '@mokly/mokly'
import { MessageField } from '../../../components/chat/MessageField'
import {
  attachmentDraft,
  draftAttachments,
} from '../../../fixtures/attachments'
import { attachmentSchema } from './chatBlockSchemas'

/**
 * The text field of a message box, registered with Mokly. Its pages show
 * the empty field, a plain draft, and a draft with chips.
 */
export const messageField = defineComponent({
  slug: 'message-field',
  title: 'Message field',
  description:
    'The text field of a message box, named "Message". A draft with an attached file, a link to a workspace of the org, or a mention of a file or a folder shows it as a chip, in the field that holds chips. Any other draft shows in the plain text field. Both fields show at least their least lines, and they grow up to their most lines. Its own page shows the empty field.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text', 'placeholder', 'lines', 'maxLines'],
    properties: {
      text: { type: 'string' },
      /** The text of an empty field. */
      placeholder: { type: 'string' },
      /** The least number of lines that the field shows. */
      lines: { type: 'integer', minimum: 1 },
      /** The most lines that the field shows before its text scrolls. */
      maxLines: { type: 'integer', minimum: 1 },
      /** The files of the draft, whose chips stand at their marks. */
      files: { type: 'array', items: attachmentSchema },
      /** The pointer over the icon of the first chip. */
      pointer: { type: 'boolean' },
      /** The pointer over the name of the first chip, a skill chip. */
      namePointer: { type: 'boolean' },
      /** The caret at this index of the text. */
      caret: { type: 'integer', minimum: 0 },
    },
  } as const,
  props: {
    text: '',
    placeholder: 'Message the agent',
    lines: 2,
    maxLines: 8,
  },
  render: (props) => (
    <MessageField
      caret={props.caret}
      files={props.files}
      lines={props.lines}
      maxLines={props.maxLines}
      namePointer={props.namePointer}
      placeholder={props.placeholder}
      pointer={props.pointer}
      text={props.text}
    />
  ),
  variants: [
    {
      slug: 'draft',
      title: 'Draft',
      description: 'A draft without chips, in the plain field.',
      props: {
        text: 'Debounce the address lookups to 250 ms, so we stay under the rate limit.',
      },
    },
    {
      slug: 'chips',
      title: 'Chips',
      description: 'A draft with two attached files, in the field with chips.',
      props: { text: attachmentDraft, files: draftAttachments },
    },
  ],
})
