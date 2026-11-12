import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesDiff = defineScreen({
  title: 'Diff preview',
  description:
    'AddressForm.tsx opened from Changes: a tab with its diff against the default branch.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'changes',
    focus: 'files',
    tab: 'diff',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
