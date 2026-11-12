import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const filesChanges = defineScreen({
  title: 'Changes',
  description:
    'The files that the branch changes against the default branch, under a summary: the number of changed files and the lines that they add and remove. A changed file opens its diff as a tab.',
  rationale:
    'Moved here from a saved state of the Files page, with the same path, so that page shows only its canonical screen.',
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
