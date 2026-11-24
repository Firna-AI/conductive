import { defineComponent } from '@mokly/mokly'
import { ListNotice } from '../../../../../../src/ui/components/files/ListNotice'
import { omittedLists } from '../../../../../../src/ui/components/files/listNoticeCopy'
import { limitedLists } from '../../../fixtures/limitedFiles'

/**
 * The notice of a file list that leaves out entries, registered with
 * Mokly. Its pages show the notice of All files and of Changes. The app
 * draws the same part.
 */
export const listNotice = defineComponent({
  slug: 'list-notice',
  title: 'List notice',
  description:
    'The notice of a file list that leaves out entries: a row in the quiet fill of a raised surface, with an info icon. All files counts the files and folders that it does not show, and Changes says that its totals include the files that it does not show. Both say where the member finds them: in the terminal, or through the agent. Its own page shows the notice of All files.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['list', 'count'],
    properties: {
      /** The list that leaves out entries. */
      list: { enum: omittedLists },
      /** The entries that it leaves out, from the list, not the limit. */
      count: { type: 'integer', minimum: 1 },
    },
  } as const,
  props: { list: 'all-files', count: limitedLists.omittedEntries },
  render: (props) => <ListNotice count={props.count} list={props.list} />,
  variants: [
    {
      slug: 'changes',
      title: 'Changes',
      description:
        'The notice under the summary of Changes, whose totals include 1,243 files that the list does not show.',
      props: { list: 'changes', count: limitedLists.totals.omitted.files },
    },
  ],
})
