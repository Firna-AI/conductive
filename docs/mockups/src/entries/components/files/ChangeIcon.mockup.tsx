import { defineComponent } from '@mokly/mokly'
import { ChangeIcon } from '../../../components/files/ChangeIcon'
import { changeKinds } from './fileSchemas'

/**
 * The mark of a changed file, registered with Mokly. Its pages show the
 * three kinds of a change, so each rule of its module has a page.
 */
export const changeIcon = defineComponent({
  slug: 'change-icon',
  title: 'Change icon',
  description:
    'A small square that marks a file as added, modified, or deleted, at the end of its row in Changes and in All files. Screen readers hear the kind of the change. Its own page shows a modified file.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['change'],
    properties: { change: { enum: changeKinds } },
  } as const,
  props: { change: 'modified' },
  render: (props) => <ChangeIcon change={props.change} />,
  variants: [
    {
      slug: 'added',
      title: 'Added',
      description: 'The mark of an added file.',
      props: { change: 'added' },
    },
    {
      slug: 'deleted',
      title: 'Deleted',
      description: 'The mark of a deleted file.',
      props: { change: 'deleted' },
    },
  ],
})
