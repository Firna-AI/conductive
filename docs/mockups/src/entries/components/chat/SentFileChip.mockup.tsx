import { defineComponent } from '@mokly/mokly'
import { SentFileChip } from '../../../../../../src/ui/components/chat/SentFileChip'
import { paths } from '../../../paths'
import { chipToSchema, openerTo } from './chipOpener'
import { chipFileSchema } from './chipSchemas'

/**
 * An attached file in the text of a sent message, registered with Mokly.
 * The app draws the same chip, so mockup-only parts render the wrapper.
 * Its adapter builds a link to the screen `to`, because a callback is not
 * data.
 */
export const sentFileChip = defineComponent({
  slug: 'sent-file-chip',
  title: 'Sent file chip',
  description:
    'An attached file in the text of a sent message, at the place of its mention: the icon of its kind, its name, and its size in a muted colour. A press opens the file tab of its copy in the cloud computer. While its message waits for the cloud computer, the chip opens nothing. Its own page shows the chip of a screenshot.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['file'],
    properties: {
      file: chipFileSchema,
      /** The text of the mention, which a copy of the message gives. */
      mention: { type: 'string' },
      to: chipToSchema,
    },
  } as const,
  props: {
    file: { name: 'postcode-overlap.png', kind: 'image', sizeBytes: 290_816 },
  },
  render: (props) => (
    <SentFileChip
      file={props.file}
      mention={props.mention}
      opener={openerTo(props.to)}
    />
  ),
  variants: [
    {
      slug: 'link',
      title: 'Opens its tab',
      description:
        'The chip of the screenshot, which opens the tab of its copy.',
      props: { to: paths.attachmentOpen },
    },
    {
      slug: 'file',
      title: 'File',
      description: 'The chip of a log file.',
      props: {
        file: { name: 'checkout-console.log', kind: 'file', sizeBytes: 12_288 },
      },
    },
  ],
})
