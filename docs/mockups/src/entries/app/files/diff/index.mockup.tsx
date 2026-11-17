import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesDiff = defineScreen({
  title: 'Diff preview',
  description:
    'A press on AddressForm.tsx in Changes opened its diff against the default branch in the temporary tab, at the end of the row. Its title shows in italics, and the next press on a file or a diff replaces it. useAddressAutocomplete.ts stays open as a kept tab, with an upright title.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press on a changed file opens its diff in the temporary tab, as a press in All files opens a file. The Temporary tab page shows the next press and the ways to keep the tab.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'changes',
    focus: 'files',
    tab: 'diff',
    temporary: 'opened',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
