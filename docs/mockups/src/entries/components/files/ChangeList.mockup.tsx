import { defineComponent } from '@mokly/mokly'
import { ChangeList } from '../../../components/files/ChangeList'
import { changedFiles } from '../../../fixtures/files'
import { changedFileSchema } from './fileSchemas'

/**
 * The Changes list of the files panel, registered with Mokly. Its pages
 * show the changes of the branch, the open diff, and a branch without
 * changes.
 */
export const changeList = defineComponent({
  slug: 'change-list',
  title: 'Change list',
  description:
    'The files that the workspace branch changes against the default branch, under a summary of the whole change. Each row shows the folder and the name of the file, its lines, and the mark of its change. A file with a diff opens it as a tab, and the row of the open diff is marked. A branch without changes shows an empty state. Its own page shows the changes of the branch.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['files', 'diffOpen'],
    properties: {
      files: { type: 'array', items: changedFileSchema },
      /** The diff of a file is the open tab, so its row is marked. */
      diffOpen: { type: 'boolean' },
      /** The page of the diff, when it differs from the plain diff. */
      diffTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { files: changedFiles, diffOpen: false },
  render: (props) => (
    <ChangeList
      diffOpen={props.diffOpen}
      diffTo={props.diffTo}
      files={props.files}
    />
  ),
  variants: [
    {
      slug: 'diff-open',
      title: 'Diff open',
      description: 'The diff of AddressForm.tsx is the open tab.',
      props: { diffOpen: true },
    },
    {
      slug: 'empty',
      title: 'No changes',
      description: 'A branch without edits, before the agent changes a file.',
      props: { files: [] },
    },
  ],
})
