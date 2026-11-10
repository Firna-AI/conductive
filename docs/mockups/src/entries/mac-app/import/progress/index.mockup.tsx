import { defineScreen } from '@mokly/mokly'
import { ConductorImportScreen } from '../../../../screens/ConductorImportScreen'
import {
  conductorImportSchema,
  firstImport,
} from '../../../../screens/conductorImportState'

const flow = ['user-flows/import-from-conductor']

export const macImportProgress = defineScreen({
  title: 'Upload',
  description:
    'Cal chose Import 2 workspaces, and the upload of Coupon totals at checkout ended. That workspace now exists: its row shows its chip, and the sidebar shows Import from Conductor with it alone, Not active. Check webhook signatures is still on its way, so it is a plain row with its name and its bytes, and no member sees it yet. The bar counts the bytes of the whole import. The chip and the sidebar row stay static here, because the drawn workspace shows both imported workspaces in its list. The other states show the start of the upload and its end.',
  rationale:
    'The user chose on 10 November 2026 that each workspace appears only when its own last part and documents are stored and checked, so no member ever sees a workspace with incomplete work. The Mac app builds the work of each workspace with Git and sends it straight to storage, in turn, so the page shows the bytes that went up.',
  relatedDocs: [],
  propSchema: conductorImportSchema,
  props: { ...firstImport, step: 'progress' },
  useCasePaths: flow,
  render: (props) => <ConductorImportScreen state={props} />,
  variants: [
    {
      slug: 'start',
      title: 'Start of the upload',
      description:
        'Import 2 workspaces just started. Coupon totals at checkout goes up first, and Check webhook signatures waits for its turn. No upload is complete yet, so both are plain rows, and the sidebar has no section Import from Conductor. The tile of Acme opens the list of Acme as it is.',
      rationale:
        'An upload that runs is only a reservation, so nothing of it shows in the org list until its own last part and documents are stored and checked.',
      props: { step: 'uploading' },
      useCasePaths: flow,
    },
    {
      slug: 'done',
      title: 'Done',
      description:
        'The import is done. A notice says that the two workspaces wait in Import from Conductor, and that opening one activates it. Each chip opens its workspace, and each row counts the sessions that came along. Under them, Stayed on this Mac lists the two changed or untracked files over 100 MiB that stayed on the Mac, each with its path, its workspace, and its size. Sessions not imported names Retry failed deliveries of Check webhook signatures, whose session file is no longer on the Mac, so that workspace came with one of its two sessions.',
      rationale:
        'The user chose on 10 November 2026 that a changed or untracked file over 100 MiB stays on the Mac and that the result lists it, while the Git bundle, the memory files, and the Markdown files always upload whole. A session whose memory file is gone has no source, so it does not import, and the result keeps its name. The upload size of each row never counted the files that stay on the Mac.',
      props: { step: 'done' },
      useCasePaths: flow,
    },
  ],
})
