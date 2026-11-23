import { defineComponent } from '@mokly/mokly'
import { DraftFileChip } from '../../../../../../src/ui/components/chat/DraftFileChip'
import { chipFileSchema, removalSchema } from './chipSchemas'

/** The upload of a file of a draft, as `ChipUpload`. */
const uploadSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['state'],
      properties: { state: { enum: ['ready', 'failed'] } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['state', 'sentBytes'],
      properties: {
        state: { const: 'uploading' },
        /** The bytes that the browser measured as sent, or null. */
        sentBytes: { type: ['integer', 'null'], minimum: 0 },
      },
    },
  ],
} as const

/** The screenshot of the draft, and the words of its removal. */
const screenshot = {
  name: 'postcode-overlap.png',
  kind: 'image',
  sizeBytes: 290_816,
} as const

/**
 * An attached file in the text of a message box, registered with Mokly.
 * The app draws the same chip, so mockup-only parts render the wrapper.
 */
export const draftFileChip = defineComponent({
  slug: 'draft-file-chip',
  title: 'Draft file chip',
  description:
    'An attached file in the text of a message box: one unit of the text, with the size of a file chip. Its icon cell shows the kind of the file, the upload ring with the share that the browser measured, a spinner before the first measurement, or the failed mark. Then come the name and a muted label: the share, "Uploading", the size, or "Failed". A failed chip offers Try again. Its own page shows an uploaded screenshot.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['file', 'upload', 'removal'],
    properties: {
      file: chipFileSchema,
      upload: uploadSchema,
      removal: removalSchema,
    },
  } as const,
  props: {
    file: screenshot,
    upload: { state: 'ready' },
    removal: { name: screenshot.name },
  },
  render: (props) => (
    <DraftFileChip
      file={props.file}
      removal={props.removal}
      upload={props.upload}
    />
  ),
  variants: [
    {
      slug: 'uploading',
      title: 'Uploading',
      description: 'The browser measured 64% of the file as sent.',
      props: { upload: { state: 'uploading', sentBytes: 186_123 } },
    },
    {
      slug: 'starting',
      title: 'Upload starting',
      description: 'The upload has no measurement yet, so a spinner shows.',
      props: { upload: { state: 'uploading', sentBytes: null } },
    },
    {
      slug: 'failed',
      title: 'Failed',
      description: 'The upload failed, so the chip offers Try again.',
      props: { upload: { state: 'failed' } },
    },
    {
      slug: 'pointer',
      title: 'Pointer over the icon',
      description: 'The pointer is over the icon, so a × takes its place.',
      props: { removal: { name: screenshot.name, pointer: true } },
    },
  ],
})
