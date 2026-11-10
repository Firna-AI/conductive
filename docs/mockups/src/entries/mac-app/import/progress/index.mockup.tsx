import { defineScreen } from '@mokly/mokly'
import {
  ConductorImportScreen,
  conductorImportSchema,
  firstImport,
} from '../../../../screens/ConductorImportScreen'

const flow = ['user-flows/import-from-conductor']

export const macImportProgress = defineScreen({
  title: 'Upload',
  description:
    'Cal chose Import 2 workspaces. The app made both workspaces at once, so the sidebar already shows Import from Conductor with both of them, Not active. The Mac app uploads the work of each one in turn: Coupon totals at checkout is up, and Check webhook signatures is on its way. The bar counts the bytes of the whole import, and each chip opens its workspace.',
  rationale:
    'The user chose on 9 November 2026 that the import creates each workspace at once. The Mac app builds the work of each workspace with Git and sends it straight to storage, so the page shows the bytes that went up. The mockups draw no file that the import leaves out, because the limit of the import is still open.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: { ...firstImport, step: 'progress' },
  useCasePaths: flow,
  render: (props) => <ConductorImportScreen state={props} />,
  variants: [
    {
      slug: 'done',
      title: 'Done',
      description:
        'The import is done. A notice says that the two workspaces wait in Import from Conductor, and that opening one activates it. Each chip opens its workspace.',
      props: { step: 'done' },
      useCasePaths: flow,
    },
  ],
})
