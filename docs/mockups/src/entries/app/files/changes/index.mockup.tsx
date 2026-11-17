import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesChanges = defineScreen({
  title: 'Changes',
  description:
    'The files that the branch changes against the default branch, under a summary: the number of changed files and the lines that they add and remove. A press on a changed file opens its diff in the temporary tab, and a double-click on its row keeps the tab.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen. The user chose option B of decision 284 on 11 November 2026: a press opens a diff in the temporary tab, and a double-click keeps the tab, as the Temporary tab page shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-failed',
    files: 'changes',
    focus: 'files',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
