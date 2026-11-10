import { defineScreen } from '@mokly/mokly'
import {
  ConductorImportScreen,
  conductorImportSchema,
  firstImport,
} from '../../../../screens/ConductorImportScreen'

export const macImportList = defineScreen({
  title: 'List states',
  description:
    'Select all is checked, so every row that can import is selected, and Import 3 workspaces is on. The box of the row of acme/mobile-app stays off.',
  rationale:
    'Select all selects only the rows that can import. A row that cannot import keeps its place, so the list keeps the order of Conductor. While only some rows are selected, Select all shows the mixed mark, which CSS draws, because a view runs no script.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: { ...firstImport, selection: 'all' },
  render: (props) => <ConductorImportScreen state={props} />,
  variants: [
    {
      slug: 'one',
      title: 'One workspace',
      description:
        'Cal selected only Coupon totals at checkout. Select all shows the mixed mark, the summary counts 1 of 3 with its size, and the button says Import 1 workspace.',
      props: { selection: 'one' },
    },
    {
      slug: 'imported',
      title: 'Imported before',
      description:
        'A later visit from the settings, after the first import. The two rows that the first import brought in have no box. Each one shows the chip of its workspace, with its state, which opens it. Nothing is selected yet, so Import is off.',
      rationale:
        'The app records the local ID of each imported workspace of Conductor, so the list knows which ones the org already has. A workspace that the org already imported cannot import again.',
      props: { rows: 'after-import', selection: 'none' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'The list as a member who is not an admin sees it. The row of acme/mobile-app says that an admin of Acme can add the repository, with no link.',
      props: { viewer: 'member' },
    },
    {
      slug: 'empty',
      title: 'Nothing to import',
      description:
        'Conductor has no workspace on this Mac that is not archived. The page says where the workspaces show, and offers no Import.',
      props: { rows: 'none', selection: 'none' },
    },
  ],
})
