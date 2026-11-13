import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesCode = defineScreen({
  title: 'Code preview',
  description:
    'useAddressAutocomplete.ts, a code file that the user kept open from All files. Its kept tab has an upright title, and the file shows with line numbers and syntax colours. Its row in the list is marked. A press on its chip in a message shows the same tab.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a double-click on the row of a file keeps its tab, so the code file stays open beside the temporary tab of the next press. A press on a file that has a tab shows that tab, as a design call of 11 November 2026 says.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'all',
    focus: 'files',
    tab: 'code',
  },
  useCasePaths: ['user-flows/mention-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
