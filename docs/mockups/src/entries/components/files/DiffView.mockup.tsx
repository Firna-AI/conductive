import { defineComponent } from '@mokly/mokly'
import { DiffView } from '../../../components/files/DiffView'
import { addressFormDiff } from '../../../fixtures/fileContents'

/** A line of a diff, as `DiffLine`: a hunk header, or a line of code. */
const diffLineSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'text'],
  properties: {
    kind: { enum: ['hunk', 'context', 'added', 'removed'] },
    text: { type: 'string' },
  },
} as const

/** A hunk of a diff: its first old and new lines, and its lines. */
const hunkSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['start', 'lines'],
  properties: {
    start: {
      type: 'object',
      additionalProperties: false,
      required: ['old', 'new'],
      properties: {
        old: { type: 'integer', minimum: 0 },
        new: { type: 'integer', minimum: 0 },
      },
    },
    lines: { type: 'array', items: diffLineSchema },
  },
} as const

/**
 * A unified diff, registered with Mokly. Its page shows the two hunks of
 * the change to AddressForm.tsx.
 */
export const diffView = defineComponent({
  slug: 'diff-view',
  title: 'Diff view',
  description:
    'A unified diff with the old and the new line numbers, a sign for each added and removed line, and syntax colours, under the header of each hunk. Its own page shows the two hunks of the change to AddressForm.tsx.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['hunks'],
    properties: { hunks: { type: 'array', items: hunkSchema } },
  } as const,
  props: { hunks: addressFormDiff },
  render: (props) => <DiffView hunks={props.hunks} />,
})
