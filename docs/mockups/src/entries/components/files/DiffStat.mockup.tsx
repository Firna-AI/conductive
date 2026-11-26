import { defineComponent } from '@mokly/mokly'
import { DiffStat } from '../../../../../../src/ui/components/files/DiffStat'

/**
 * The lines that a change adds and removes, registered with Mokly. The app
 * draws the same part, so mockup-only parts render the wrapper and the
 * parts that the app reaches keep the plain part.
 */
export const diffStat = defineComponent({
  slug: 'diff-stat',
  title: 'Diff stat',
  description:
    'The lines that a change adds and removes, such as "+38 −6": in Changes, in the header of a diff, and in the files of a finished turn. A file that only removes lines shows only its removed lines. Screen readers hear both counts. Its own page shows a modified file.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['added', 'removed'],
    properties: {
      added: { type: 'integer', minimum: 0 },
      removed: { type: 'integer', minimum: 0 },
    },
  } as const,
  props: { added: 38, removed: 6 },
  render: (props) => <DiffStat added={props.added} removed={props.removed} />,
  variants: [
    {
      slug: 'added',
      title: 'Lines added',
      description: 'A new file, which only adds lines.',
      props: { added: 64, removed: 0 },
    },
    {
      slug: 'removed',
      title: 'Lines removed',
      description: 'A deleted file, which shows only the lines it removes.',
      props: { added: 0, removed: 12 },
    },
  ],
})
