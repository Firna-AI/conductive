import { defineComponent } from '@mokly/mokly'
import { DraftText } from '../../../components/chat/DraftText'
import {
  afterDropCaret,
  attachmentDraft,
  draftAttachments,
  uploadingAttachments,
} from '../../../fixtures/attachments'
import { mentionChipsDraft } from '../../../fixtures/fileMentions'
import { followUpTask } from '../../../fixtures/workspaceLinkConversations'
import { attachmentSchema } from './chatBlockSchemas'

/**
 * The draft of a message box with its chips, registered with Mokly. Its
 * pages show attached files, a caret after a drop, the pointer over a
 * chip, file mentions, and a workspace link.
 */
export const draftText = defineComponent({
  slug: 'draft-text',
  title: 'Draft text',
  description:
    'The draft of a message box as plain text, with each attached file, each link to a workspace of the org or to one of its sessions, and each mention of a file or a folder as a chip. A chip is one unit of the text, which the caret steps over and Backspace removes whole. Each chip starts with the cell of its icon, which a pointer turns into a × that removes it. Its own page shows a draft with two attached files.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      /** The draft, with the mark of each attached file at its place. */
      text: { type: 'string' },
      /** The files of the draft, by the IDs of their marks. */
      files: { type: 'array', items: attachmentSchema },
      /** The pointer over the icon of the first chip. */
      pointer: { type: 'boolean' },
      /** The caret at this index of the text. */
      caret: { type: 'integer', minimum: 0 },
    },
  } as const,
  props: { text: attachmentDraft, files: draftAttachments },
  render: (props) => (
    <DraftText
      caret={props.caret}
      files={props.files}
      pointer={props.pointer}
      text={props.text}
    />
  ),
  variants: [
    {
      slug: 'uploading',
      title: 'Uploading, caret after the drop',
      description:
        'A dropped screenshot uploads, and the caret stands after its chip.',
      props: { files: uploadingAttachments, caret: afterDropCaret },
    },
    {
      slug: 'pointer',
      title: 'Pointer over a chip',
      description: 'The pointer is over the icon of the first chip.',
      props: { pointer: true },
    },
    {
      slug: 'mentions',
      title: 'Mentions',
      description: 'A draft with a file chip and a folder chip.',
      props: { text: mentionChipsDraft, files: [] },
    },
    {
      slug: 'workspace-link',
      title: 'Workspace link',
      description: 'A pasted link of a workspace of the org shows as its chip.',
      props: { text: followUpTask, files: [] },
    },
  ],
})
