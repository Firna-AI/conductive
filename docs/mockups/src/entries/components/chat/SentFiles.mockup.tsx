import { defineComponent } from '@mokly/mokly'
import { SentFiles } from '../../../components/chat/SentFiles'
import { draftAttachments } from '../../../fixtures/attachments'
import { attachmentSchema } from './chatBlockSchemas'

/**
 * The files of a sent message that its text does not show, registered
 * with Mokly. Its page shows the two files of a message from before files
 * had a place in its text.
 */
export const sentFiles = defineComponent({
  slug: 'sent-files',
  title: 'Sent files',
  description:
    'The files of a sent message that its text does not show, under its bubble, at the right: the icon of the kind of each file, its name, and its size. A message from before files had a place in the text holds no mention of its files, so they all show here.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['files'],
    properties: { files: { type: 'array', items: attachmentSchema } },
  } as const,
  props: { files: draftAttachments },
  render: (props) => <SentFiles files={props.files} />,
})
