import { defineComponent } from '@mokly/mokly'
import { ChangeList } from '../../../components/files/ChangeList'
import { changedFiles } from '../../../fixtures/files'
import { limitedLists } from '../../../fixtures/limitedFiles'
import { limitedPageOf } from '../../../limitedListPaths'
import { paths } from '../../../paths'
import { changedFileSchema, limitedTotalsSchema } from './fileSchemas'
import { fileRowMenuSchema, pointerMenu } from './rowMenuSchemas'

/**
 * The Changes list of the files panel, registered with Mokly. Its pages
 * show the changes of the branch, the open diff, a branch without changes,
 * the menu of a row, and a list that leaves out files.
 */
export const changeList = defineComponent({
  slug: 'change-list',
  title: 'Change list',
  description:
    'The files that the workspace branch changes against the default branch, under a summary of the whole change. Each row shows the folder and the name of the file, its lines, and the mark of its change. A file with a diff opens it as a tab, and the row of the open diff is marked. A right click opens the menu of a row at the pointer, and the row keeps the fill of a hover. A branch without changes shows an empty state. A list that leaves out files gives the totals of the whole change in its summary, with a notice under it. Its own page shows the changes of the branch.',
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
      /** The open menu of a row, at the pointer or under a sheet. */
      menu: fileRowMenuSchema,
      /** The totals of a list that leaves out files. */
      totals: limitedTotalsSchema,
    },
  } as const,
  props: { files: changedFiles, diffOpen: false },
  render: (props) => (
    <ChangeList
      diffOpen={props.diffOpen}
      diffTo={props.diffTo}
      files={props.files}
      menu={props.menu}
      totals={props.totals}
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
    {
      slug: 'menu',
      title: 'Row menu',
      description:
        'A right click on AddressForm.tsx opened its menu at the pointer: Add to chat, then Copy path.',
      props: { menu: pointerMenu('src/app/checkout/AddressForm.tsx') },
    },
    {
      slug: 'limited',
      title: 'Files left out',
      description:
        'The branch changes 2,243 files, and the list shows 1,000 of them. The summary gives the totals of the whole change, and the notice under it says that the totals include 1,243 files that the list does not show. A press on AddressForm.tsx opens its diff beside the limited lists.',
      props: {
        files: limitedLists.changes,
        totals: limitedLists.totals,
        diffTo: limitedPageOf(paths.diff),
      },
    },
  ],
})
